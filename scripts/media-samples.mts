// pnpm media:samples <carpeta> (BD-050): pone en MEDIA_DIR los pósters y videos de ejemplo del hero
// a partir de la carpeta de la demo (bolik-demo-offline/videos: planta.jpg, planta.mp4…). No van al
// repo, que es público: el repo solo guarda sus claves y medidas (prisma/seed/media.json).
// - Cada imagen de media.json (sample) se procesa con process-image.ts desde <carpeta>/<originalName>;
//   la clave que sale debe ser la del manifiesto (mismo archivo, mismo hash).
// - Cada video del hero (/media/video/<nombre>-demo.mp4) se copia desde <carpeta>/<nombre>.mp4.
// Reemplaza los archivos de relleno que deja scripts/ci/sample-media.mjs. La fila de MediaAsset la
// crea `pnpm db:seed` (perfiles dev y e2e). Lee los .env como `next dev`.
import { copyFile, mkdir, mkdtemp, readFile, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import nextEnv from "@next/env";
import { parseSeedData } from "../prisma/seed/data";
import { MEDIA_WIDTHS } from "../src/lib/image-loader";
import { processImage } from "../src/server/media/process-image";

nextEnv.loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production", {
  info: () => {},
  error: console.error,
});

function fail(message: string): never {
  console.error(`✖ ${message}`);
  process.exit(1);
}

const source = process.argv[2];
if (!source || process.argv.length > 3) fail("Uso: pnpm media:samples <carpeta de la demo>.");
const mediaDir = path.resolve(process.env.MEDIA_DIR ?? "./.media");
const data = parseSeedData();
// Se procesa en una carpeta temporal y solo se copia a MEDIA_DIR si la clave coincide: un archivo
// equivocado no deja MEDIA_DIR sin pósters ni con archivos huérfanos.
const scratch = await mkdtemp(path.join(os.tmpdir(), "bolik-media-samples-"));
/** Tope de docs/09 §5 para el video de escritorio. */
const MAX_VIDEO_BYTES = 6 * 1024 * 1024;

for (const asset of data.media.filter((m) => m.sample)) {
  const folder = path.posix.dirname(asset.key);
  const name = path.parse(asset.originalName).name;
  const original = path.join(source, asset.originalName);
  const buffer = await readFile(original).catch(() => fail(`No está ${original}.`));
  const processed = await processImage(buffer, { folder, name, mediaDir: scratch });
  if (processed.key !== asset.key) {
    await rm(scratch, { recursive: true, force: true });
    fail(
      `${asset.originalName} dio la clave ${processed.key} y media.json espera ${asset.key}: no es el mismo archivo de la demo.`,
    );
  }
  // Pisa los de relleno de scripts/ci/sample-media.mjs, si estaban.
  await mkdir(path.join(mediaDir, folder), { recursive: true });
  for (const width of MEDIA_WIDTHS) {
    const file = `${asset.key}-${width}.webp`;
    await copyFile(path.join(scratch, file), path.join(mediaDir, file));
  }
  console.log(`✔ ${asset.key} (${processed.width}×${processed.height})`);
}

const videos = data.content.heroChapters.flatMap((h) =>
  h.sampleMedia ? [h.videoDesktop, h.videoMobile].filter((v): v is string => Boolean(v)) : [],
);
for (const url of videos) {
  const match = /^\/media\/video\/([a-z0-9-]+)-demo\.mp4$/.exec(url);
  if (!match) fail(`${url}: los videos de ejemplo se llaman /media/video/<nombre>-demo.mp4.`);
  const original = path.join(source, `${match[1]}.mp4`);
  const target = path.join(mediaDir, "video", `${match[1]}-demo.mp4`);
  await mkdir(path.dirname(target), { recursive: true });
  const size = await stat(original).then(
    (info) => info.size,
    () => fail(`No está ${original}.`),
  );
  if (size > MAX_VIDEO_BYTES) {
    console.warn(`  ⚠ ${original} pesa ${(size / 1024 / 1024).toFixed(1)} MB (docs/09: ≤ 6 MB).`);
  }
  await copyFile(original, target);
  console.log(`✔ ${url}`);
}
await rm(scratch, { recursive: true, force: true });
console.log(`Listo en ${mediaDir}.`);
