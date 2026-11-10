import { createReadStream } from "node:fs";
import { realpath, stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { env } from "@/env";
import { MEDIA_WIDTHS } from "@/lib/image-loader";

/**
 * /media/* sin IIS (BD-034): en el servidor, IIS sirve /media desde D:\bolik\media y la petición
 * nunca llega a Node (docs/15 §4). En desarrollo, en `pnpm start:local` y en la CI no hay IIS:
 * esta ruta lee de MEDIA_DIR con las mismas reglas (caché de un año, los nombres llevan hash).
 * Solo sirve lo que genera server/media/process-image.ts (`…-{ancho}.webp`, en minúsculas) y nunca
 * sale de MEDIA_DIR, ni siguiendo un enlace simbólico.
 */

/** Carpeta o nombre: minúsculas, dígitos y guiones (como las claves de MediaAsset). */
const SEGMENT = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const FILE = new RegExp(`^[a-z0-9]+(?:-[a-z0-9]+)*-(?:${MEDIA_WIDTHS.join("|")})\\.webp$`);

const notFound = () => new Response(null, { status: 404 });

/** `child` está dentro de `root` (y no es `root`). */
function isInside(root: string, child: string): boolean {
  const relative = path.relative(root, child);
  return relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative);
}

export async function GET(_request: Request, ctx: RouteContext<"/media/[...path]">) {
  const { path: segments } = await ctx.params;
  const name = segments.at(-1);
  const folders = segments.slice(0, -1);
  if (!name || !FILE.test(name) || folders.length === 0 || !folders.every((s) => SEGMENT.test(s))) {
    return notFound();
  }

  try {
    const root = await realpath(path.resolve(env.MEDIA_DIR));
    // realpath resuelve enlaces simbólicos: lo que se compara es el archivo que de verdad se leería.
    const file = await realpath(path.resolve(root, ...segments));
    if (!isInside(root, file)) return notFound();
    const info = await stat(file);
    if (!info.isFile()) return notFound();
    return new Response(Readable.toWeb(createReadStream(file)) as ReadableStream, {
      headers: {
        "Content-Type": "image/webp",
        "Content-Length": String(info.size),
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return notFound();
  }
}
