import { z } from "zod";
import { MAX_PATH_LENGTH, normalizeStoredPath } from "@/lib/redirect-path";
import { notFoundHits } from "@/server/seo/not-found-log";

/**
 * Aviso de la página 404 (BD-046): la 404 es estática (leer la petición la volvería dinámica, y con
 * ella todas las rutas), así que un script mínimo manda aquí la ruta que no existe. Se cuenta en
 * memoria y se escribe en lote en NotFoundLog (server/seo/hit-log.ts, con tope por lote).
 * Siempre responde 204: es estadística y no le dice nada a quien lo llama. Para que otro sitio no
 * pueda llenar la tabla a través de sus visitantes, solo cuenta avisos del mismo sitio, con un
 * cuerpo pequeño.
 */

/** El aviso real pesa unos cientos de bytes. */
const MAX_BODY_BYTES = 4_096;

const bodySchema = z.object({
  p: z.string().startsWith("/").max(2_000),
  r: z.string().max(2_000).optional(),
});

const noContent = () => new Response(null, { status: 204 });

/** Lee el cuerpo como texto sin pasar del tope (aunque no venga Content-Length). */
async function readLimited(request: Request): Promise<string | null> {
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_BODY_BYTES || !request.body) return null;
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BODY_BYTES) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  return new TextDecoder().decode(Buffer.concat(chunks));
}

/** Solo origen y ruta de un referer http(s): sin query (puede traer búsquedas o datos personales). */
function cleanReferer(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:"
      ? `${url.origin}${url.pathname}`
      : null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  // Los navegadores modernos dicen de dónde sale la petición: un aviso de otro sitio no cuenta.
  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin") return noContent();

  const text = await readLimited(request);
  if (!text) return noContent();
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return noContent();
  }
  const parsed = bodySchema.safeParse(json);
  if (parsed.success) {
    const path = normalizeStoredPath(parsed.data.p).slice(0, MAX_PATH_LENGTH);
    notFoundHits.record(path, cleanReferer(parsed.data.r));
  }
  return noContent();
}
