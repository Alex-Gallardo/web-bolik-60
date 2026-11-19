import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { cacheLife, cacheTag } from "next/cache";
import { ImageResponse } from "next/og";
import sharp from "sharp";
import { ogText } from "@/content/og";
import { env } from "@/env";
import { SITE } from "@/features/seo/metadata";
import { log } from "@/server/log";

/** Medida de docs/10 §3: la que piden Facebook, LinkedIn y WhatsApp. */
export const OG_SIZE = { width: 1200, height: 630 } as const;
export const OG_CONTENT_TYPE = "image/png";

/**
 * Colores de tokens.css (docs/02): next/og no entiende variables de CSS, así que van los valores.
 * Si cambia la paleta, cambiarlos aquí también (como en los correos, server/mail/quote-emails.ts).
 */
const C = {
  navy: "#0b1433", // check-colors-ignore
  yellow: "#ffc72c", // check-colors-ignore
  paper: "#ffffff", // check-colors-ignore
  onDark: "#dce3ff", // check-colors-ignore
  onDarkMuted: "#aab6e6", // check-colors-ignore
} as const;

/** Ancho de la foto a partir del que se arma el PNG (MEDIA_WIDTHS): basta para un panel de 480. */
const PHOTO_SOURCE_WIDTH = 960;
const PHOTO_BOX = 460;

const dataUri = (png: Buffer) => `data:image/png;base64,${png.toString("base64")}`;

/**
 * El logo blanco de public/brand en PNG: satori no dibuja bien el degradado del trazo de crayón
 * dentro de un SVG, sharp sí. En el standalone, process.cwd() es la carpeta del release, donde el
 * despliegue copia public/. Sin el archivo, la imagen sale con el nombre en texto (y lo avisa).
 */
async function logo(): Promise<string | null> {
  try {
    const svg = await readFile(path.join(process.cwd(), "public", "brand", "bolik-logo-white.svg"));
    return dataUri(await sharp(svg, { density: 200 }).resize({ width: 520 }).png().toBuffer());
  } catch (error) {
    log.warn({ err: error }, "Imagen Open Graph sin logo");
    return null;
  }
}

/**
 * Una foto del catálogo (ruta base del loader, «/media/products/bolik-ultra-…») en PNG: los
 * archivos son WebP y next/og no lee WebP. Lee de MEDIA_DIR, sin salir de ahí (la ruta solo admite
 * minúsculas, dígitos, «/» y «-»); si no está (la CI no tiene fotos), la imagen sale sin foto. Un
 * MEDIA_DIR relativo (./.media en la CI) se resuelve contra la carpeta desde la que corre Next: en
 * el build, la raíz del repo; en el standalone, la del release. En el servidor es absoluto.
 */
async function photo(src: string): Promise<string | null> {
  const prefix = `${env.MEDIA_PUBLIC_PATH}/`;
  if (!src.startsWith(prefix)) return null;
  const relative = `${src.slice(prefix.length)}-${PHOTO_SOURCE_WIDTH}.webp`;
  if (!/^[a-z0-9/-]+-\d+\.webp$/.test(relative) || relative.includes("..")) return null;
  try {
    const file = await readFile(path.join(path.resolve(env.MEDIA_DIR), relative));
    const png = await sharp(file)
      .resize(PHOTO_BOX * 2, PHOTO_BOX * 2, { fit: "inside", withoutEnlargement: true })
      .flatten({ background: C.paper })
      .png()
      .toBuffer();
    return dataUri(png);
  } catch (error) {
    // Que falte la foto es normal (CI, fotos de ejemplo sin poner); otro error se avisa.
    if ((error as NodeJS.ErrnoException).code !== "ENOENT")
      log.warn({ err: error, src }, "Imagen Open Graph sin foto");
    return null;
  }
}

type OgImageArgs = {
  /** Encima del título: la categoría de un producto o «Catálogo Bolik». */
  eyebrow?: string;
  title: string;
  subtitle?: string | null;
  /** Ruta base de una foto del catálogo (ImageView.src). */
  photoSrc?: string | null;
  /** Tags de caché de lo que muestra (lib/cache-tags.ts): al editarlo, la imagen se vuelve a generar. */
  tags?: string[];
};

/** Achica el título largo; lineClamp corta en tres líneas lo que aún no quepa. */
const titleSize = (title: string, withPhoto: boolean) => {
  const perLine = withPhoto ? 18 : 28;
  return title.length <= perLine * 2 ? 72 : 56;
};

/**
 * Imagen Open Graph de 1200 × 630 (BD-090, docs/10 §3) como respuesta PNG. Los bytes quedan en la
 * caché ('use cache'): se dibuja una vez (en el build, o la primera visita) y vuelve a dibujarse
 * cuando se invalida uno de sus tags. Sin la caché, la ruta sería dinámica y dibujaría en cada
 * visita (leer archivos y sharp no terminan dentro del prerender).
 */
export async function ogImageResponse(args: OgImageArgs) {
  const png = await ogPng(args);
  return new Response(png, { headers: { "Content-Type": OG_CONTENT_TYPE } });
}

async function ogPng({ tags = [], ...args }: OgImageArgs): Promise<Uint8Array<ArrayBuffer>> {
  "use cache";
  cacheLife("max");
  if (tags.length) cacheTag(...tags);
  const { response, complete } = await draw(args);
  // Sin logo o sin foto (un archivo que no estaba, una unidad que no respondió): se guarda poco
  // tiempo y se vuelve a intentar, en lugar de quedar así hasta la próxima edición.
  if (!complete) cacheLife("minutes");
  return new Uint8Array(await response.arrayBuffer());
}

/**
 * Fondo azul marino, logo, título y, si hay foto, la foto en un panel blanco a la derecha. Fuente:
 * la que trae next/og (las de la marca llegan en WOFF2 con next/font y next/og no lee WOFF2).
 */
async function draw({ eyebrow, title, subtitle, photoSrc }: Omit<OgImageArgs, "tags">) {
  const [logoUri, photoUri] = await Promise.all([logo(), photoSrc ? photo(photoSrc) : null]);
  const domain = new URL(SITE.url).host;
  const complete = logoUri !== null && (!photoSrc || photoUri !== null);

  const response = new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        background: C.navy,
        color: C.paper,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          flex: 1,
          padding: "64px 56px 56px 72px",
        }}
      >
        {logoUri ? (
          // eslint-disable-next-line @next/next/no-img-element -- next/og dibuja <img>, no next/image
          <img src={logoUri} width={260} height={119} alt="" />
        ) : (
          <div style={{ display: "flex", fontSize: 64, letterSpacing: 2 }}>
            {SITE.name.toLocaleUpperCase("es-GT")}
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {eyebrow ? (
            <div style={{ display: "flex", fontSize: 30, color: C.yellow }}>{eyebrow}</div>
          ) : null}
          <div
            style={{
              display: "block",
              lineClamp: 3,
              fontSize: titleSize(title, Boolean(photoUri)),
              lineHeight: 1.1,
              letterSpacing: -1,
            }}
          >
            {title}
          </div>
          {subtitle ? (
            <div
              style={{
                display: "block",
                lineClamp: 2,
                fontSize: 30,
                lineHeight: 1.3,
                color: C.onDark,
              }}
            >
              {subtitle}
            </div>
          ) : null}
        </div>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            columnGap: 16,
            fontSize: 26,
            color: C.onDarkMuted,
          }}
        >
          <span>{domain}</span>
          <span style={{ color: C.yellow }}>·</span>
          <span>{ogText.footer}</span>
        </div>
      </div>
      {photoUri ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 520,
            background: C.paper,
            borderLeft: `12px solid ${C.yellow}`,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- next/og dibuja <img> */}
          <img
            src={photoUri}
            width={PHOTO_BOX}
            height={PHOTO_BOX}
            alt=""
            style={{ objectFit: "contain" }}
          />
        </div>
      ) : null}
    </div>,
    OG_SIZE,
  );
  return { response, complete };
}
