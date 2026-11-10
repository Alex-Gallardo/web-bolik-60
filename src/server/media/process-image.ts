import { createHash, randomUUID } from "node:crypto";
import { access, mkdir, rename, rm } from "node:fs/promises";
import path from "node:path";
import sharp, { type Metadata } from "sharp";
import { MEDIA_WIDTHS } from "@/lib/image-loader";
import { slugify } from "@/lib/slug";

/**
 * Procesa una foto UNA vez al subirla (BD-034, docs/03 §7): WebP en los 6 anchos del loader
 * (`clave-320.webp` … `clave-1920.webp`), blurDataURL, medidas y color dominante. La clave lleva un
 * hash del contenido y de los parámetros (`products/bolik-ultra-azul-a1b2c3d4`): la misma foto con
 * el mismo nombre da la misma clave (subirla dos veces no duplica ni reescribe lo que ya se sirve)
 * y la caché de un año es segura (si cambian la calidad o los anchos, cambia la clave).
 * - Decodifica el original una sola vez: de un maestro de hasta 1920 px salen los 6 anchos, el
 *   blur y el color (una foto de 49 MP: 1.8 s en lugar de 5 s).
 * - Nunca agranda: si la foto es más chica que un ancho, ese archivo queda del tamaño original (el
 *   loader siempre encuentra los 6).
 * - Endereza según la orientación EXIF, convierte a sRGB y no copia metadatos (ni la ubicación GPS
 *   de quien la tomó).
 * - Rechaza con MediaError lo que no es imagen o no se puede decodificar (un JPEG cortado, un HEIC
 *   de iPhone, un SVG, una animación), archivos de más de 25 MB e imágenes con demasiados píxeles
 *   (una «bomba» de descompresión tumbaría el servidor).
 * - Cada archivo se escribe con otro nombre y se renombra al final; si algo falla, borra lo que
 *   creó: no quedan archivos a medias ni huérfanos.
 * Sin "server-only": también lo usa scripts/import-media.mts, que corre fuera de Next.
 */

export const MEDIA_LIMITS = {
  maxBytes: 25 * 1024 * 1024,
  /** 50 megapíxeles: una foto de cámara cabe de sobra. */
  maxPixels: 50_000_000,
  /** Calidad WebP: la de 640 de una foto de 4 MB queda bajo 60 KB (criterio de BD-034). */
  quality: 75,
} as const;

/** Entra en el hash: si cambian la calidad o los anchos, las claves nuevas no pisan las viejas. */
const PIPELINE = `v1:q${MEDIA_LIMITS.quality}:${MEDIA_WIDTHS.join(",")}`;

/** sharp informa los AVIF como `heif` con compresión `av1`; el HEIC (hevc) no lo decodifica. */
const ACCEPTED_FORMATS = new Set(["jpeg", "png", "webp", "heif"]);

/** Carpeta dentro de MEDIA_DIR: minúsculas y guiones, con subcarpetas («products», «hero/posters»). */
const FOLDER = /^[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*$/;
/** MediaAsset.key es VarChar(200): carpeta (100) + «/» + nombre (80) + «-» + hash (8). */
const MAX_FOLDER_LENGTH = 100;
const MAX_NAME_LENGTH = 80;

export type MediaErrorCode = "too-large" | "unsupported" | "too-many-pixels" | "invalid-folder";

export class MediaError extends Error {
  constructor(
    readonly code: MediaErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "MediaError";
  }
}

export type ProcessedImage = {
  /** Ruta base sin ancho ni extensión, relativa a MEDIA_DIR: `products/bolik-ultra-azul-a1b2c3d4`. */
  key: string;
  width: number;
  height: number;
  /** Tamaño del archivo original. */
  bytes: number;
  mime: "image/webp";
  blurDataUrl: string;
  dominantColor: string;
  /** Rutas absolutas de los 6 archivos (recién escritos o que ya existían). */
  files: string[];
};

export type ProcessOptions = {
  /** Carpeta dentro de MEDIA_DIR. */
  folder: string;
  /** Nombre legible (el del archivo subido o el del producto): se vuelve slug. */
  name: string;
  mediaDir: string;
};

const toHex = (n: number) => n.toString(16).padStart(2, "0").toUpperCase();
const exists = (file: string) =>
  access(file).then(
    () => true,
    () => false,
  );
/** Error del sistema de archivos (disco lleno, sin permiso…): no es culpa de la imagen. */
const isFsError = (error: unknown) =>
  typeof (error as { code?: unknown })?.code === "string" && "syscall" in (error as object);

export async function processImage(
  input: Buffer,
  { folder, name, mediaDir }: ProcessOptions,
): Promise<ProcessedImage> {
  if (!FOLDER.test(folder) || folder.length > MAX_FOLDER_LENGTH) {
    throw new MediaError("invalid-folder", `Carpeta inválida: ${folder}`);
  }
  if (input.byteLength > MEDIA_LIMITS.maxBytes) {
    throw new MediaError("too-large", "La imagen pesa más de 25 MB");
  }

  const options = { limitInputPixels: MEDIA_LIMITS.maxPixels, failOn: "error" } as const;
  let metadata: Metadata;
  try {
    metadata = await sharp(input, options).metadata();
  } catch (error) {
    if (error instanceof Error && /pixel limit/i.test(error.message)) {
      throw new MediaError("too-many-pixels", "La imagen tiene demasiados píxeles");
    }
    throw new MediaError("unsupported", "El archivo no es una imagen que se pueda leer");
  }
  if (!metadata.format || !ACCEPTED_FORMATS.has(metadata.format)) {
    throw new MediaError("unsupported", `Formato no aceptado: ${metadata.format ?? "desconocido"}`);
  }
  if (metadata.format === "heif" && metadata.compression !== "av1") {
    throw new MediaError("unsupported", "Formato no aceptado: HEIC (guárdala como JPEG)");
  }
  if ((metadata.pages ?? 1) > 1) {
    throw new MediaError("unsupported", "Las imágenes animadas no se aceptan");
  }
  // Medidas ya enderezadas (una foto vertical de teléfono viene «acostada» con orientación 6 u 8).
  const width = metadata.autoOrient?.width ?? metadata.width;
  const height = metadata.autoOrient?.height ?? metadata.height;
  if (!width || !height) throw new MediaError("unsupported", "La imagen no tiene medidas");

  const hash = createHash("sha256").update(PIPELINE).update(input).digest("hex").slice(0, 8);
  const slug = slugify(name).slice(0, MAX_NAME_LENGTH).replace(/-+$/, "") || "imagen";
  const key = `${folder}/${slug}-${hash}`;
  const base = path.resolve(mediaDir, ...key.split("/"));
  const files = MEDIA_WIDTHS.map((target) => `${base}-${target}.webp`);
  const created: string[] = [];

  try {
    // Maestro: el original enderezado y reducido al ancho mayor, sin comprimir. Aquí se decodifica
    // el original (la única vez); un archivo dañado falla en este paso.
    const largest = MEDIA_WIDTHS[MEDIA_WIDTHS.length - 1]!;
    const master = await sharp(input, options)
      .rotate() // sin argumentos: endereza según EXIF; sharp no copia metadatos a la salida
      .resize({ width: largest, withoutEnlargement: true })
      .raw()
      .toBuffer({ resolveWithObject: true });
    const fromMaster = () => sharp(master.data, { raw: master.info });

    // Si los 6 ya existen (la misma foto otra vez), no se reescribe lo que ya se está sirviendo.
    const present = await Promise.all(files.map(exists));
    if (!present.every(Boolean)) {
      await mkdir(path.dirname(base), { recursive: true });
      for (const [i, target] of MEDIA_WIDTHS.entries()) {
        const file = files[i]!;
        const temp = `${file}.${randomUUID()}.tmp`;
        created.push(temp);
        await fromMaster()
          .resize({ width: target, withoutEnlargement: true })
          .webp({ quality: MEDIA_LIMITS.quality })
          .toFile(temp);
        await rename(temp, file);
        created[created.length - 1] = file;
      }
    }

    const blur = await fromMaster()
      .resize(10, 10, { fit: "inside" })
      .webp({ quality: 50 })
      .toBuffer();
    // Sobre blanco: en un PNG con fondo transparente, el color sería el del fondo «vacío» (negro).
    // stats() mide la imagen de entrada e ignora las operaciones: primero se aplana y se
    // materializa (en chico, basta para el color), y se mide ese resultado.
    const flat = await fromMaster()
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .resize(64, 64, { fit: "inside" })
      .raw()
      .toBuffer({ resolveWithObject: true });
    const { dominant } = await sharp(flat.data, { raw: flat.info }).stats();

    return {
      key,
      width,
      height,
      bytes: input.byteLength,
      mime: "image/webp",
      blurDataUrl: `data:image/webp;base64,${blur.toString("base64")}`,
      dominantColor: `#${toHex(dominant.r)}${toHex(dominant.g)}${toHex(dominant.b)}`,
      files,
    };
  } catch (error) {
    await Promise.all(created.map((file) => rm(file, { force: true })));
    if (error instanceof MediaError || isFsError(error)) throw error;
    if (error instanceof Error && /pixel limit/i.test(error.message)) {
      throw new MediaError("too-many-pixels", "La imagen tiene demasiados píxeles");
    }
    throw new MediaError("unsupported", "La imagen está dañada o no se puede procesar");
  }
}
