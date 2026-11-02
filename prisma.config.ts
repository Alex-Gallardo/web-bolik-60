import nextEnv from "@next/env";
import { defineConfig } from "prisma/config";

// La CLI de Prisma lee .env.local igual que Next (mismas reglas y prioridad de archivos).
nextEnv.loadEnvConfig(process.cwd());

/**
 * Configuración de la CLI de Prisma (docs/05 §3): migraciones, Studio y generate. La app no usa
 * este archivo: el cliente se crea en src/server/db.ts con el adaptador de SQL Server.
 * - MIGRATE_DATABASE_URL (usuario con permisos DDL) para desplegar; si falta, DATABASE_URL.
 * - SHADOW_DATABASE_URL: base temporal de `migrate dev`; sin ella Prisma intentaría crear una
 *   base y el login de la app no tiene permiso.
 * Se leen opcionales para que `prisma generate` funcione sin base (CI, instalación).
 */
const url = process.env.MIGRATE_DATABASE_URL || process.env.DATABASE_URL;
const shadowDatabaseUrl = process.env.SHADOW_DATABASE_URL || undefined;

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url, shadowDatabaseUrl },
});
