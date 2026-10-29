import "server-only";
import { db } from "@/server/db";
import { env } from "@/env";

/**
 * IndexNow: avisa a Bing, Yandex, Seznam, Naver… (y a los asistentes que usan esos índices)
 * que una URL cambió. Google no usa IndexNow; para Google bastan el sitemap y Search Console.
 *
 * 1) Las acciones del admin llaman enqueueIndexNow(urls) después de guardar.
 * 2) Un proceso (scripts/flush-indexnow.ts, tarea programada cada 10 min, o `after()` en la acción)
 *    envía en lote hasta 10 000 URLs por petición.
 * El archivo de verificación public/{INDEXNOW_KEY}.txt contiene la misma clave.
 */
export async function enqueueIndexNow(paths: string[]) {
  if (env.APP_ENV !== "production" || !paths.length) return;
  const urls = [...new Set(paths)].map((p) => new URL(p, env.NEXT_PUBLIC_SITE_URL).toString());
  await db.indexNowSubmission.createMany({ data: urls.map((url) => ({ url })) });
}

export async function flushIndexNow() {
  const pending = await db.indexNowSubmission.findMany({ where: { status: "pendiente" }, take: 1000, orderBy: { id: "asc" } });
  if (!pending.length) return { sent: 0 };
  const host = new URL(env.NEXT_PUBLIC_SITE_URL).host;
  const res = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      host,
      key: env.INDEXNOW_KEY,
      keyLocation: `${env.NEXT_PUBLIC_SITE_URL}/${env.INDEXNOW_KEY}.txt`,
      urlList: [...new Set(pending.map((p) => p.url))],
    }),
    signal: AbortSignal.timeout(10_000),
  });
  const ok = res.status === 200 || res.status === 202;
  await db.indexNowSubmission.updateMany({
    where: { id: { in: pending.map((p) => p.id) } },
    data: ok ? { status: "enviada", sentAt: new Date() } : { status: "error" },
  });
  return { sent: ok ? pending.length : 0, status: res.status };
}
