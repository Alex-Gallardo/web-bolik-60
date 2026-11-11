import "server-only";
import { env } from "@/env";
import { MAX_PATH_LENGTH } from "@/lib/redirect-path";
import type { HitEntry } from "@/server/seo/hit-log";
import { log } from "@/server/log";
import { proxyDb } from "./proxy-db";

/**
 * Escrituras del registro de 404 y de usos de redirecciones (BD-046), en lote desde
 * server/seo/hit-log.ts. Con DATA_SOURCE=fixtures no hay base: no se registra nada. Las claves ya
 * vienen normalizadas (lib/redirect-path.ts). Una fila que falla no corta el resto del lote.
 */

async function eachEntry(
  name: string,
  entries: HitEntry[],
  write: (entry: HitEntry) => Promise<unknown>,
) {
  for (const entry of entries) {
    try {
      await write(entry);
    } catch (error) {
      log.error({ name, err: error }, "Registro en lote: falló una fila");
    }
  }
}

/** Suma los 404 a NotFoundLog (una fila por ruta, con contador y el último referer). */
export async function writeNotFoundHits(entries: HitEntry[]): Promise<void> {
  if (env.DATA_SOURCE !== "db") return;
  const { db } = await import("@/server/db");
  await eachEntry("not-found", entries, ({ key, count, detail, lastAt }) => {
    const path = key.slice(0, MAX_PATH_LENGTH);
    const referer = detail ? detail.slice(0, 450) : null;
    return db.notFoundLog.upsert({
      where: { path },
      create: { path, hits: count, referer, lastSeenAt: lastAt },
      update: { hits: { increment: count }, lastSeenAt: lastAt, ...(referer && { referer }) },
    });
  });
}

/**
 * Suma los usos de cada redirección (Redirect.hits) y la fecha del último; la clave es su
 * fromPath tal como está guardado. Corre en proxy.ts: usa el cliente del proxy (proxy-db.ts).
 */
export async function writeRedirectHits(entries: HitEntry[]): Promise<void> {
  if (env.DATA_SOURCE !== "db") return;
  await eachEntry("redirect", entries, ({ key, count, lastAt }) =>
    proxyDb().redirect.updateMany({
      where: { fromPath: key },
      data: { hits: { increment: count }, lastHitAt: lastAt },
    }),
  );
}
