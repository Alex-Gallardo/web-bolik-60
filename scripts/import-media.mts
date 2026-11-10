// pnpm import:media <carpeta> [--folder products] [--remoto] (BD-034, docs/03 §7): procesa en lote
// las fotos de una carpeta (JPEG, PNG, WebP, AVIF) y las registra en MediaAsset. Escribe los WebP
// en MEDIA_DIR y la fila en la base de DATABASE_URL. Idempotente: la misma foto con el mismo
// nombre da la misma clave (hash del contenido), así que volver a correrlo no duplica nada.
// Lee los .env como `next dev`.
// Los archivos y las filas deben quedar en el mismo entorno: por defecto solo corre contra una
// base de desarrollo o de pruebas (…_Dev, …_Test). Para staging o producción, se corre EN ese
// servidor (con su MEDIA_DIR) y con --remoto.
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import nextEnv from "@next/env";
import { PrismaMssql } from "@prisma/adapter-mssql";
import { PrismaClient } from "../src/generated/prisma/client";
import { saveMediaAsset } from "../src/server/data/media";
import { MediaError, processImage } from "../src/server/media/process-image";

nextEnv.loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production", {
  info: () => {},
  error: console.error,
});

const USAGE = "Uso: pnpm import:media <carpeta> [--folder products] [--remoto].";

function fail(message: string): never {
  console.error(`✖ ${message}`);
  process.exit(1);
}

function readArgs() {
  try {
    return parseArgs({
      options: {
        folder: { type: "string", default: "products" },
        remoto: { type: "boolean", default: false },
      },
      allowPositionals: true,
      strict: true,
    });
  } catch (error) {
    fail(`Argumento no reconocido (${(error as Error).message}). ${USAGE}`);
  }
}

const args = readArgs();
const source = args.positionals[0];
if (!source || args.positionals.length > 1) fail(USAGE);
const folder = args.values.folder;
// La misma regla que process-image.ts: se avisa una vez, no una por foto.
if (
  !/^[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*$/.test(folder) ||
  folder.length > 100
) {
  fail(
    `Carpeta de destino inválida: «${folder}» (minúsculas, dígitos y guiones; «products», «hero/posters»).`,
  );
}
const mediaDir = process.env.MEDIA_DIR;
const url = process.env.DATABASE_URL;
if (!mediaDir) fail("Falta MEDIA_DIR.");
if (!url) fail("Falta DATABASE_URL.");

const isDirectory = await stat(source).then(
  (info) => info.isDirectory(),
  () => false,
);
if (!isDirectory) fail(`No existe la carpeta ${source}.`);
const IMAGE = /\.(jpe?g|png|webp|avif)$/i;
const names = (await readdir(source)).filter((name) => IMAGE.test(name)).sort();
if (names.length === 0) fail(`No hay imágenes (JPEG, PNG, WebP, AVIF) en ${source}.`);

/** Primera línea del error, sin los argumentos de la consulta que Prisma copia debajo. */
const firstLine = (error: unknown) =>
  (error instanceof Error ? error.message : String(error)).split("\n").find((l) => l.trim()) ?? "";

const db = new PrismaClient({ adapter: new PrismaMssql(url) });
let ok = 0;
let skipped = 0;
try {
  const [row] = await db.$queryRaw<{ name: string }[]>`SELECT DB_NAME() AS name`;
  const database = row?.name ?? "";
  const appEnv = process.env.APP_ENV ?? "development";
  const local = appEnv === "development" && /_(dev|test)$/i.test(database);
  if (!local && !args.values.remoto) {
    console.error(
      `✖ La base «${database}» (APP_ENV=${appEnv}) no es de desarrollo. Los archivos irían a ${mediaDir} de este equipo y las filas a esa base: córrelo en ese servidor, con su MEDIA_DIR, y agrega --remoto.`,
    );
    process.exitCode = 1;
  } else {
    console.log(
      `Importando ${names.length} imágenes de ${source} a ${mediaDir}/${folder} (base ${database}).`,
    );
    for (const name of names) {
      try {
        const input = await readFile(path.join(source, name));
        const image = await processImage(input, {
          folder,
          name: path.parse(name).name,
          mediaDir,
        });
        await saveMediaAsset(db, image, { originalName: name });
        ok += 1;
        console.log(`  ✔ ${name} → ${image.key} (${image.width}×${image.height})`);
      } catch (error) {
        skipped += 1;
        const code = (error as { code?: unknown }).code;
        // De Prisma (P…) solo el código: su mensaje trae los argumentos de la consulta.
        const reason =
          error instanceof MediaError
            ? error.message
            : typeof code === "string" && code.startsWith("P")
              ? `no se pudo registrar en la base (${code})`
              : firstLine(error);
        console.warn(`  ⚠ ${name}: ${reason}`);
      }
    }
    console.log(`✔ ${ok} importadas, ${skipped} omitidas.`);
    if (skipped > 0) process.exitCode = 1;
  }
} catch (error) {
  const code = (error as { code?: unknown }).code;
  console.error(
    `✖ La importación falló${typeof code === "string" ? ` (${code})` : ""}: ${firstLine(error)}`,
  );
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
