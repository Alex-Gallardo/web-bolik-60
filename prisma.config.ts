import nextEnv from "@next/env";
import { defineConfig } from "prisma/config";

// La CLI de Prisma lee los .env igual que `next dev` (.env.development.local, .env.local…); en un
// servidor (NODE_ENV=production) las variables vienen del entorno del proceso, no de archivos locales.
nextEnv.loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");

/**
 * Configuración de la CLI de Prisma (docs/05 §3): migraciones y generate. La app no usa este
 * archivo: el cliente se crea en src/server/db.ts con el adaptador de SQL Server.
 * - MIGRATE_DATABASE_URL (usuario con permisos DDL): obligatoria para migrar en staging y
 *   producción, donde el login de la app no debe poder cambiar el esquema. En desarrollo basta
 *   DATABASE_URL.
 * - SHADOW_DATABASE_URL: base temporal de `migrate dev`; sin ella Prisma intentaría crear una
 *   base y el login de la app no tiene permiso.
 * Las URL son opcionales para que `prisma generate` funcione sin base (CI, pnpm install).
 */
const deployed = ["staging", "production"].includes(process.env.APP_ENV ?? "");
const migrating = process.argv.includes("migrate") || process.argv.includes("db");
if (deployed && migrating && !process.env.MIGRATE_DATABASE_URL) {
  throw new Error(
    "Falta MIGRATE_DATABASE_URL: en staging y producción se migra con el usuario de despliegue.",
  );
}
const url = process.env.MIGRATE_DATABASE_URL || process.env.DATABASE_URL;
const shadowDatabaseUrl = process.env.SHADOW_DATABASE_URL || undefined;

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url, shadowDatabaseUrl },
});
