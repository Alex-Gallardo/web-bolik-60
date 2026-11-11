// pnpm db:seed [--profile dev|e2e|prod] (BD-031, docs/05 §6): carga prisma/seed/*.json en la base
// de DATABASE_URL. Lee los .env igual que `next dev` (.env.local…); en un servidor
// (NODE_ENV=production) las variables vienen del entorno del proceso.
// El admin inicial sale de SEED_ADMIN_EMAIL y SEED_ADMIN_PASSWORD; sin contraseña se omite.
import { parseArgs } from "node:util";
import nextEnv from "@next/env";
import { PrismaMssql } from "@prisma/adapter-mssql";
import { z } from "zod";
import { parseSeedData } from "../prisma/seed/data";
import {
  isSeedProfile,
  SEED_PROFILES,
  seedMode,
  seedTargetProblem,
  type SeedProfile,
} from "../prisma/seed/profiles";
import { seedDatabase, type SeedAdmin } from "../prisma/seed/seed";
import { PrismaClient } from "../src/generated/prisma/client";

nextEnv.loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production", {
  info: () => {},
  error: console.error,
});

function fail(message: string): never {
  console.error(`✖ ${message}`);
  process.exit(1);
}

/**
 * --profile x o --profile=x; cualquier otro argumento es un error, no un perfil por defecto.
 * --allow-sample-data: ejemplos en staging (perfil dev, base …_Stg) hasta el catálogo real (BD-038).
 */
function readArgs(): { profile: SeedProfile; allowSampleData: boolean } {
  let value: string | undefined;
  let allowSampleData = false;
  try {
    ({
      values: { profile: value, "allow-sample-data": allowSampleData = false },
    } = parseArgs({
      options: {
        profile: { type: "string", default: "dev" },
        "allow-sample-data": { type: "boolean", default: false },
      },
      strict: true,
      allowPositionals: false,
    }));
  } catch (error) {
    fail(
      `Argumento no reconocido (${(error as Error).message}). Uso: pnpm db:seed --profile ${SEED_PROFILES.join(" | ")} [--allow-sample-data].`,
    );
  }
  if (!value || !isSeedProfile(value)) {
    fail(`Perfil inválido: usa --profile ${SEED_PROFILES.join(" | ")}.`);
  }
  return { profile: value, allowSampleData };
}

/** Admin inicial desde el entorno; la contraseña nunca se imprime. */
function readAdmin(): SeedAdmin | undefined {
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!password) return undefined;
  const parsed = z
    .object({
      email: z.string().trim().pipe(z.email()),
      // bcrypt ignora lo que pasa de 72 bytes: una contraseña más larga se truncaría sin aviso.
      password: z
        .string()
        .min(12)
        .refine((p) => Buffer.byteLength(p) <= 72),
    })
    .safeParse({ email: process.env.SEED_ADMIN_EMAIL, password });
  if (!parsed.success) {
    fail(
      "SEED_ADMIN_EMAIL debe ser un correo y SEED_ADMIN_PASSWORD tener entre 12 caracteres y 72 bytes.",
    );
  }
  return parsed.data;
}

const { profile, allowSampleData } = readArgs();
const url = process.env.DATABASE_URL;
if (!url) fail("Falta DATABASE_URL.");

const admin = readAdmin();
const db = new PrismaClient({ adapter: new PrismaMssql(url) });

try {
  const [row] = await db.$queryRaw<{ name: string }[]>`SELECT DB_NAME() AS name`;
  const databaseName = row?.name ?? "";
  const problem = seedTargetProblem(profile, {
    appEnv: process.env.APP_ENV ?? "development",
    databaseName,
    allowSampleData,
  });
  if (problem) {
    console.error(`✖ ${problem}`);
    process.exitCode = 1;
  } else {
    const { counts, warnings } = await seedDatabase(db, parseSeedData(), { profile, admin });
    const mode =
      seedMode(profile) === "sync" ? "sincroniza con los JSON" : "solo crea lo que falta";
    console.log(`✔ Seed "${profile}" en ${databaseName} (${mode}).`);
    for (const warning of warnings) console.warn(`  ⚠ ${warning}`);
    if (!admin) console.log("  Sin SEED_ADMIN_PASSWORD: no se creó el admin inicial.");
    console.table(counts);
  }
} catch (error) {
  // Solo el código y la primera y última línea del mensaje: entre ellas, Prisma copia los
  // argumentos de la consulta (por ejemplo, el hash de la contraseña del admin).
  const { code, message = String(error) } = error as { code?: string; message?: string };
  const lines = message.split("\n").filter((line) => line.trim() !== "");
  const summary = lines.length > 1 ? `${lines[0]} … ${lines.at(-1)}` : (lines[0] ?? "");
  console.error(`✖ El seed falló${code ? ` (${code})` : ""}: ${summary}`);
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
