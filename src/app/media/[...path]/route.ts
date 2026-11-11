import { createReadStream } from "node:fs";
import { realpath, stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { env } from "@/env";
import { parseRange } from "@/lib/http-range";
import { MEDIA_WIDTHS } from "@/lib/image-loader";

/**
 * /media/* sin IIS (BD-034): en el servidor, IIS sirve /media desde D:\bolik\media y la petición
 * nunca llega a Node (docs/15 §4). En desarrollo, en `pnpm start:local` y en la CI no hay IIS:
 * esta ruta lee de MEDIA_DIR con las mismas reglas (caché de un año, los nombres llevan hash).
 * Solo sirve lo que genera server/media/process-image.ts (`…-{ancho}.webp`, en minúsculas) y los
 * videos del hero en `video/…mp4` (BD-050), y nunca sale de MEDIA_DIR, ni siguiendo un enlace
 * simbólico. Los videos responden a `Range` (206): Safari no reproduce un video sin rangos.
 */

/** Carpeta o nombre: minúsculas, dígitos y guiones (como las claves de MediaAsset). */
const SEGMENT = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const IMAGE = new RegExp(`^[a-z0-9]+(?:-[a-z0-9]+)*-(?:${MEDIA_WIDTHS.join("|")})\\.webp$`);
const VIDEO = /^[a-z0-9]+(?:-[a-z0-9]+)*\.mp4$/;
const VIDEO_FOLDER = "video";

const notFound = () => new Response(null, { status: 404 });

/** `child` está dentro de `root` (y no es `root`). */
function isInside(root: string, child: string): boolean {
  const relative = path.relative(root, child);
  return relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative);
}

export async function GET(request: Request, ctx: RouteContext<"/media/[...path]">) {
  const { path: segments } = await ctx.params;
  const name = segments.at(-1);
  const folders = segments.slice(0, -1);
  if (!name || folders.length === 0 || !folders.every((s) => SEGMENT.test(s))) return notFound();
  const isVideo = VIDEO.test(name) && folders.length === 1 && folders[0] === VIDEO_FOLDER;
  if (!isVideo && !IMAGE.test(name)) return notFound();

  try {
    const root = await realpath(path.resolve(env.MEDIA_DIR));
    // realpath resuelve enlaces simbólicos: lo que se compara es el archivo que de verdad se leería.
    const file = await realpath(path.resolve(root, ...segments));
    if (!isInside(root, file)) return notFound();
    const info = await stat(file);
    if (!info.isFile()) return notFound();
    const headers: Record<string, string> = {
      "Content-Type": isVideo ? "video/mp4" : "image/webp",
      // Los WebP llevan hash en el nombre; los videos todavía no (BD-122): un día, no un año.
      "Cache-Control": isVideo ? "public, max-age=86400" : "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    };
    if (!isVideo) {
      return new Response(Readable.toWeb(createReadStream(file)) as ReadableStream, {
        headers: { ...headers, "Content-Length": String(info.size) },
      });
    }
    headers["Accept-Ranges"] = "bytes";
    const range = parseRange(request.headers.get("range"), info.size);
    if (range === "invalid") {
      return new Response(null, {
        status: 416,
        headers: { ...headers, "Content-Range": `bytes */${info.size}` },
      });
    }
    if (!range) {
      return new Response(Readable.toWeb(createReadStream(file)) as ReadableStream, {
        headers: { ...headers, "Content-Length": String(info.size) },
      });
    }
    const stream = createReadStream(file, { start: range.start, end: range.end });
    return new Response(Readable.toWeb(stream) as ReadableStream, {
      status: 206,
      headers: {
        ...headers,
        "Content-Length": String(range.end - range.start + 1),
        "Content-Range": `bytes ${range.start}-${range.end}/${info.size}`,
      },
    });
  } catch {
    return notFound();
  }
}
