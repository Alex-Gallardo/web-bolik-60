// pnpm media:samples <carpeta> [<carpeta>…] (BD-050, BD-062): pone en MEDIA_DIR los pósters y
// videos de ejemplo del hero (carpeta de la demo, bolik-demo-offline/videos: planta.jpg,
// planta.mp4…) y las fotos de producto provisionales (carpeta «recursos web bolik»). No van al
// repo, que es público: el repo solo guarda sus claves y medidas (prisma/seed/media.json).
// - Cada imagen de media.json (sample) se busca como <carpeta>/<originalName> en las carpetas, en
//   orden, y se procesa con process-image.ts con el nombre de su clave; la clave que sale debe ser
//   la del manifiesto (mismo archivo, mismo hash). La que no está en ninguna carpeta se avisa y se
//   salta (en la CI la reemplaza scripts/ci/sample-media.mjs).
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

const sources = process.argv.slice(2);
if (sources.length === 0)
  fail("Uso: pnpm media:samples <carpeta de la demo> [<carpeta de fotos>…].");
const mediaDir = path.resolve(process.env.MEDIA_DIR ?? "./.media");
const data = parseSeedData();
// Se procesa en una carpeta temporal y solo se copia a MEDIA_DIR si la clave coincide: un archivo
// equivocado no deja MEDIA_DIR sin pósters ni con archivos huérfanos.
const scratch = await mkdtemp(path.join(os.tmpdir(), "bolik-media-samples-"));
/** Tope de docs/09 §5 para el video de escritorio. */
const MAX_VIDEO_BYTES = 6 * 1024 * 1024;

/** El primer <carpeta>/<archivo> que existe, o null. */
async function findSource(file: string): Promise<string | null> {
  for (const source of sources) {
    const candidate = path.join(source, file);
    if (
      await stat(candidate).then(
        (info) => info.isFile(),
        () => false,
      )
    )
      return candidate;
  }
  return null;
}

let skipped = 0;
for (const asset of data.media.filter((m) => m.sample)) {
  const folder = path.posix.dirname(asset.key);
  // El nombre sale de la clave («hero/planta-c6dcd764» → planta): el archivo original puede
  // llamarse distinto («fotos ultra-04.jpg» → bolik-ultra-azul-principal).
  const name = path.posix.basename(asset.key).replace(/-[0-9a-f]{8}$/, "");
  const original = await findSource(asset.originalName);
  if (!original) {
    console.warn(`  ⚠ ${asset.originalName} no está en ${sources.join(" ni en ")}: se salta.`);
    skipped++;
    continue;
  }
  const buffer = await readFile(original);
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
  const original = await findSource(`${match[1]}.mp4`);
  if (!original) {
    console.warn(`  ⚠ ${match[1]}.mp4 no está en ${sources.join(" ni en ")}: se salta.`);
    skipped++;
    continue;
  }
  const target = path.join(mediaDir, "video", `${match[1]}-demo.mp4`);
  await mkdir(path.dirname(target), { recursive: true });
  const { size } = await stat(original);
  if (size > MAX_VIDEO_BYTES) {
    console.warn(`  ⚠ ${original} pesa ${(size / 1024 / 1024).toFixed(1)} MB (docs/09: ≤ 6 MB).`);
  }
  await copyFile(original, target);
  console.log(`✔ ${url}`);
}
await rm(scratch, { recursive: true, force: true });
console.log(`Listo en ${mediaDir}${skipped ? ` (${skipped} sin su archivo de origen)` : ""}.`);
