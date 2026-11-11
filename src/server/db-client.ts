import "server-only";
import { PrismaMssql } from "@prisma/adapter-mssql";
import { env } from "@/env";
import { PrismaClient } from "@/generated/prisma/client";

/**
 * Crea un cliente de Prisma con el adaptador de SQL Server (docs/05 §3), sin guardarlo en ningún
 * lado. Lo usan src/server/db.ts (el cliente de la app) y src/server/data/proxy-db.ts (el de
 * proxy.ts, que se compila aparte). El pool de mssql cierra las conexiones inactivas a los 30 s.
 */
export function createPrismaClient(): PrismaClient {
  // Con SKIP_ENV_VALIDATION (CI) la variable puede faltar: mejor un error claro que uno del driver.
  if (!env.DATABASE_URL) throw new Error("DATABASE_URL no está definida: no hay conexión a la BD.");
  return new PrismaClient({
    adapter: new PrismaMssql(env.DATABASE_URL),
    log: env.APP_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}
