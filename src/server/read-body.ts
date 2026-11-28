import "server-only";

/**
 * Lee el cuerpo de una petición como texto sin pasar de `maxBytes`, aunque no venga
 * Content-Length (o mienta): "too-large" si se pasa; null si no hay cuerpo. Lo usan los avisos del
 * navegador (/api/not-found, BD-046; /api/beacon, BD-083).
 */
export async function readBodyLimited(
  request: Request,
  maxBytes: number,
): Promise<string | "too-large" | null> {
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > maxBytes) return "too-large";
  if (!request.body) return null;
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      return "too-large";
    }
    chunks.push(value);
  }
  return new TextDecoder().decode(Buffer.concat(chunks));
}
