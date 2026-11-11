// @vitest-environment node
import { mkdtemp, readdir, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { MEDIA_WIDTHS } from "@/lib/image-loader";
import { processImage } from "./process-image";

// Procesamiento de imágenes (BD-034) con sharp real, sobre una carpeta temporal.
let mediaDir: string;
let photo: Buffer;

/**
 * «Foto» de 4000 × 3000 en JPEG de calidad alta (~4 MB): ruido suavizado con tonos, que se
 * comprime como una foto real (ni tan fácil como un color plano ni tan difícil como ruido puro).
 */
async function makePhoto(width = 4000, height = 3000): Promise<Buffer> {
  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 0, g: 0, b: 0 },
      noise: { type: "gaussian", mean: 128, sigma: 60 },
    },
  })
    .blur(3)
    .modulate({ saturation: 1.6 })
    .jpeg({ quality: 100, chromaSubsampling: "4:4:4" })
    .toBuffer();
}

const mtimes = (files: string[]) =>
  Promise.all(files.map(async (file) => (await stat(file)).mtimeMs));

beforeAll(async () => {
  // En Windows, la caché de libvips deja abiertos los archivos leídos y no se pueden borrar.
  sharp.cache(false);
  mediaDir = await mkdtemp(path.join(tmpdir(), "bolik-media-"));
  photo = await makePhoto();
}, 60_000);

afterAll(async () => {
  await rm(mediaDir, { recursive: true, force: true });
});

describe("processImage (BD-034)", () => {
  it("una foto de ~4 MB genera 6 archivos y la de 640 pesa menos de 60 KB", async () => {
    expect(photo.byteLength).toBeGreaterThan(4 * 1024 * 1024);
    const image = await processImage(photo, {
      folder: "products",
      name: "Bolik Ultra Azul",
      mediaDir,
    });
    expect(image.key).toMatch(/^products\/bolik-ultra-azul-[0-9a-f]{8}$/);
    expect(image).toMatchObject({ width: 4000, height: 3000, mime: "image/webp" });
    expect(image.files).toHaveLength(6);
    for (const [i, w] of MEDIA_WIDTHS.entries()) {
      expect(image.files[i]).toBe(
        path.join(mediaDir, "products", `${image.key.split("/")[1]}-${w}.webp`),
      );
      const meta = await sharp(image.files[i]).metadata();
      expect(meta).toMatchObject({ format: "webp", width: w });
    }
    const size640 = (await stat(image.files[MEDIA_WIDTHS.indexOf(640)]!)).size;
    expect(size640).toBeLessThan(60 * 1024);
    expect(image.blurDataUrl).toMatch(/^data:image\/webp;base64,/);
    expect(image.blurDataUrl.length).toBeLessThan(1_000);
    expect(image.dominantColor).toMatch(/^#[0-9A-F]{6}$/);
    // Ningún archivo temporal queda en la carpeta.
    const leftovers = (await readdir(path.join(mediaDir, "products"))).filter((f) =>
      f.endsWith(".tmp"),
    );
    expect(leftovers).toEqual([]);
  }, 60_000);

  it("la misma foto da la misma clave y no reescribe lo que ya existe", async () => {
    const options = { folder: "products", name: "Otra vez", mediaDir };
    const small = await makePhoto(800, 600);
    const first = await processImage(small, options);
    const written = await mtimes(first.files);
    await new Promise((resolve) => setTimeout(resolve, 50));
    const second = await processImage(small, options);
    expect(second).toEqual(first);
    expect(await mtimes(second.files)).toEqual(written);
    // Otra foto con el mismo nombre no pisa a la primera: su hash es otro.
    const other = await processImage(await makePhoto(801, 600), options);
    expect(other.key).not.toBe(first.key);
  }, 60_000);

  it("un nombre largo o raro da una clave válida", async () => {
    const small = await makePhoto(400, 300);
    const long = await processImage(small, {
      folder: "products",
      name: `${"a".repeat(79)} final`,
      mediaDir,
    });
    expect(long.key).toMatch(/^products\/a{79}-[0-9a-f]{8}$/); // sin guion doble
    const odd = await processImage(small, { folder: "products", name: "¿¡!?", mediaDir });
    expect(odd.key).toMatch(/^products\/imagen-[0-9a-f]{8}$/);
  }, 60_000);

  it("nunca agranda: una foto chica deja sus 6 archivos del tamaño original", async () => {
    const small = await makePhoto(500, 400);
    const image = await processImage(small, { folder: "products", name: "chica", mediaDir });
    expect(image.files).toHaveLength(6);
    const widths = await Promise.all(
      image.files.map(async (f) => (await sharp(f).metadata()).width),
    );
    expect(widths).toEqual([320, 480, 500, 500, 500, 500]);
  }, 60_000);

  it("endereza la foto según el EXIF y no copia los metadatos", async () => {
    // 600 × 400 con orientación 6 (girada 90°): se ve de 400 × 600.
    const rotated = await sharp(await makePhoto(600, 400))
      .withMetadata({ orientation: 6, exif: { IFD0: { Artist: "Quien la tomó" } } })
      .jpeg()
      .toBuffer();
    const image = await processImage(rotated, { folder: "products", name: "vertical", mediaDir });
    expect([image.width, image.height]).toEqual([400, 600]);
    const out = await sharp(image.files[0]!).metadata();
    expect(out.height).toBeGreaterThan(out.width!);
    expect(out.exif).toBeUndefined();
    expect(out.orientation).toBeUndefined();
  }, 60_000);

  it("rechaza lo que no es imagen, una carpeta inválida y un archivo enorme", async () => {
    const options = { folder: "products", name: "x", mediaDir };
    await expect(processImage(Buffer.from("no soy una imagen"), options)).rejects.toMatchObject({
      code: "unsupported",
    });
    await expect(processImage(photo, { ...options, folder: "../fuera" })).rejects.toMatchObject({
      code: "invalid-folder",
    });
    await expect(
      processImage(photo, { ...options, folder: "a".repeat(101) }),
    ).rejects.toMatchObject({ code: "invalid-folder" });
    await expect(processImage(Buffer.alloc(26 * 1024 * 1024), options)).rejects.toMatchObject({
      code: "too-large",
    });
  });

  it("rechaza una imagen con demasiados píxeles", async () => {
    // PNG de 8000 × 8000 (64 MP) de un solo color: pesa poco, pero descomprimido tumbaría el servidor.
    const bomb = await sharp({
      create: { width: 8000, height: 8000, channels: 3, background: { r: 255, g: 255, b: 255 } },
      limitInputPixels: false,
    })
      .png()
      .toBuffer();
    await expect(
      processImage(bomb, { folder: "products", name: "bomba", mediaDir }),
    ).rejects.toMatchObject({ code: "too-many-pixels" });
  }, 60_000);

  it("un JPEG cortado se rechaza con un error claro y no deja archivos", async () => {
    const dir = path.join(mediaDir, "cortadas");
    const small = await makePhoto(1200, 900);
    const truncated = small.subarray(0, Math.floor(small.byteLength / 2));
    await expect(
      processImage(truncated, { folder: "cortadas", name: "cortada", mediaDir }),
    ).rejects.toMatchObject({ name: "MediaError", code: "unsupported" });
    const left = await readdir(dir).catch(() => [] as string[]);
    expect(left).toEqual([]);
  }, 60_000);

  it("rechaza SVG, GIF y animaciones", async () => {
    const options = { folder: "products", name: "x", mediaDir };
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>');
    await expect(processImage(svg, options)).rejects.toMatchObject({ code: "unsupported" });
    const frame = (b: number) =>
      sharp({ create: { width: 20, height: 20, channels: 3, background: { r: 0, g: 0, b } } });
    const gif = await frame(255).gif().toBuffer();
    await expect(processImage(gif, options)).rejects.toMatchObject({ code: "unsupported" });
    const animated = await sharp(
      [await frame(255).png().toBuffer(), await frame(0).png().toBuffer()],
      { join: { animated: true } },
    )
      .webp()
      .toBuffer();
    expect((await sharp(animated).metadata()).pages).toBe(2);
    await expect(processImage(animated, options)).rejects.toMatchObject({ code: "unsupported" });
  }, 60_000);

  it("un PNG con fondo transparente conserva la transparencia y su color real", async () => {
    // Cuadro rojo de 400 px sobre un lienzo transparente de 600 × 600.
    const red = await sharp({
      create: {
        width: 400,
        height: 400,
        channels: 4,
        background: { r: 220, g: 30, b: 30, alpha: 1 },
      },
    })
      .png()
      .toBuffer();
    const png = await sharp({
      create: { width: 600, height: 600, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
    })
      .composite([{ input: red }])
      .png()
      .toBuffer();
    const image = await processImage(png, { folder: "products", name: "recorte", mediaDir });
    expect((await sharp(image.files[0]!).metadata()).hasAlpha).toBe(true);
    // Sobre blanco, el color dominante es el rojo del producto o el blanco, nunca el negro «vacío».
    const [r, g, b] = [1, 3, 5].map((i) =>
      Number.parseInt(image.dominantColor.slice(i, i + 2), 16),
    );
    expect(r! + g! + b!).toBeGreaterThan(100);
  }, 60_000);

  it("un JPEG en CMYK (de imprenta) sale en sRGB", async () => {
    const cmyk = await sharp(await makePhoto(600, 400))
      .toColourspace("cmyk")
      .jpeg()
      .toBuffer();
    expect((await sharp(cmyk).metadata()).space).toBe("cmyk");
    const image = await processImage(cmyk, { folder: "products", name: "imprenta", mediaDir });
    expect(await sharp(image.files[0]!).metadata()).toMatchObject({ space: "srgb", channels: 3 });
  }, 60_000);
});
