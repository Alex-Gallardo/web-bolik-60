import "server-only";
import type { PrismaClient } from "@/generated/prisma/client";
import { createPrismaClient } from "@/server/db-client";

/**
 * Cliente de Prisma de proxy.ts (BD-046): el proxy se compila aparte de la app y no debe crear ni
 * reutilizar el `globalThis.prisma` de la app. Se crea al primer uso (con DATA_SOURCE=fixtures
 * nunca). Un pool más, pequeño: solo lee Redirect cada 60 s y escribe sus usos en lote.
 */
const globalForProxy = globalThis as unknown as { bolikProxyPrisma?: PrismaClient };

export function proxyDb(): PrismaClient {
  return (globalForProxy.bolikProxyPrisma ??= createPrismaClient());
}
