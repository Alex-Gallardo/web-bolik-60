import "server-only";
import { env } from "@/env";
import type { RedirectRow } from "@/lib/redirect-path";
import { proxyDb } from "./proxy-db";

/**
 * Redirecciones activas de la tabla Redirect (BD-046), para el mapa en memoria de proxy.ts. Con
 * DATA_SOURCE=fixtures no hay base ni redirecciones (las de Joomla van en el mapa estático, BD-094).
 * No pasa por dataSource(): el proxy no necesita (ni debe cargar) la capa de lectura de la app.
 */
export async function listActiveRedirects(): Promise<RedirectRow[]> {
  if (env.DATA_SOURCE !== "db") return [];
  return proxyDb().redirect.findMany({
    where: { active: true },
    select: { fromPath: true, toPath: true, statusCode: true },
    orderBy: { id: "asc" },
  });
}
