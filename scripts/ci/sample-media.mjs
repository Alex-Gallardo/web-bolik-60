// Reemplazos de los medios de ejemplo (BD-050) para la CI y para `pnpm start:local` sin
// `pnpm media:samples`: las ilustraciones y videos de la demo no van al repo (es público), pero el
// hero las pide. Para cada imagen de prisma/seed/media.json escribe los 6 WebP con su clave (un
// degradado de marca con grano, de peso parecido al de una ilustración real, para que Lighthouse
// mida un LCP con imagen) y, para cada video del hero, un archivo que no es un video: el hero lo
// detecta y se queda con el póster, sin errores de red en la consola.
// Nunca pisa un archivo que ya existe: con las ilustraciones reales en MEDIA_DIR no hace nada.
// Uso: node scripts/ci/sample-media.mjs [carpeta]   (por defecto, MEDIA_DIR o ./.media)
import { access, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = fileURLToPath(new URL("../../", import.meta.url));
// Los mismos anchos que src/lib/image-loader.ts (MEDIA_WIDTHS): lo comprueba
// src/components/hero/sample-media.test.ts.
export const SAMPLE_WIDTHS = [320, 480, 640, 960, 1280, 1920];

const exists = (file) =>
  access(file).then(
    () => true,
    () => false,
  );

async function readJson(relative) {
  const { readFile } = await import("node:fs/promises");
  return JSON.parse(await readFile(path.join(root, relative), "utf8"));
}

/** Degradado navy → azul con grano: comprime como una ilustración, no como un color plano. */
async function placeholder(width, height) {
  const pixels = Buffer.alloc(width * height * 3);
  let seed = 7;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      const grain = (seed % 13) - 6;
      const t = (x / width + y / height) / 2;
      const i = (y * width + x) * 3;
      pixels[i] = Math.max(0, Math.min(255, 14 + 30 * t + grain));
      pixels[i + 1] = Math.max(0, Math.min(255, 27 + 60 * t + grain));
      pixels[i + 2] = Math.max(0, Math.min(255, 61 + 120 * t + grain));
    }
  }
  return sharp(pixels, { raw: { width, height, channels: 3 } })
    .webp({ quality: 75 })
    .toBuffer();
}

/** Devuelve cuántos archivos escribió. */
export async function ensureSampleMedia(mediaDir) {
  const media = await readJson("prisma/seed/media.json");
  const content = await readJson("prisma/seed/content.json");
  let written = 0;

  for (const asset of media) {
    for (const width of SAMPLE_WIDTHS) {
      const file = path.join(mediaDir, `${asset.key}-${width}.webp`);
      if (await exists(file)) continue;
      // Como process-image.ts: nunca agranda.
      const w = Math.min(width, asset.width);
      const h = Math.round((asset.height * w) / asset.width);
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, await placeholder(w, h));
      written++;
    }
  }

  // Solo los videos de la demo (sampleMedia) y solo con la forma /media/video/<nombre>.mp4.
  const videos = content.heroChapters
    .filter((c) => c.sampleMedia)
    .flatMap((c) => [c.videoDesktop, c.videoMobile])
    .filter((v) => typeof v === "string" && /^\/media\/video\/[a-z0-9-]+\.mp4$/.test(v));
  for (const url of videos) {
    const file = path.join(mediaDir, "video", path.posix.basename(url));
    if (await exists(file)) continue;
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, "Reemplazo de la CI: no es un video (scripts/ci/sample-media.mjs).\n");
    written++;
  }
  return written;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const dir = path.resolve(process.argv[2] ?? process.env.MEDIA_DIR ?? "./.media");
  const written = await ensureSampleMedia(dir);
  console.log(`Medios de ejemplo en ${dir}: ${written} reemplazos nuevos.`);
}
