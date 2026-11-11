import "server-only";
import type { PrismaClient } from "@/generated/prisma/client";
import { createPrismaClient } from "./db-client";

/**
 * Cliente de Prisma único de la app (docs/05 §3). Solo se importa desde src/server (regla de lint):
 * las páginas leen datos a través de src/server/data. proxy.ts no lo usa: tiene el suyo
 * (server/data/proxy-db.ts), porque se compila en otro bundle y sus clases de error de Prisma no
 * serían las de la app (los errores de Prisma se distinguen por `code`, nunca por `instanceof`).
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Guardado en globalThis también en producción: si el bundler carga este módulo más de una vez
// (recarga en caliente, bundles distintos), se reutiliza el mismo pool en lugar de abrir otro.
export const db = (globalForPrisma.prisma ??= createPrismaClient());
