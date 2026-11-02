import "server-only";
import { PrismaMssql } from "@prisma/adapter-mssql";
import { env } from "@/env";
import { PrismaClient } from "@/generated/prisma/client";

/**
 * Cliente de Prisma único (docs/05 §3) con el adaptador de SQL Server. Solo se importa desde
 * src/server (regla de lint): las páginas leen datos a través de src/server/data.
 * El pool de mssql cierra las conexiones inactivas a los 30 s (valor por defecto).
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient(): PrismaClient {
  const adapter = new PrismaMssql(env.DATABASE_URL);
  return new PrismaClient({
    adapter,
    log: env.APP_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

export const db = globalForPrisma.prisma ?? createClient();

// En desarrollo, la recarga en caliente reutiliza el cliente en lugar de abrir otro pool.
if (env.APP_ENV !== "production") globalForPrisma.prisma = db;
