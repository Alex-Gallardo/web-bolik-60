import { NextResponse, type NextRequest } from "next/server";
import { SITE } from "@/features/seo/metadata";
import { redirectHits, redirectStore } from "@/server/seo/redirects";

/**
 * Proxy (Next 16, antes middleware), BD-046:
 * 1. Redirecciones de la tabla Redirect con 301 (o el estado guardado) en un solo salto
 *    (docs/10 §6). El mapa vive en memoria (server/seo/redirects.ts): ninguna petición espera a la
 *    base, salvo las primeras tras arrancar.
 * 2. La barra final: `skipTrailingSlashRedirect` desactiva la de Next, que corría antes que el
 *    proxy y hacía dos saltos (`/viejo/` → `/viejo` → destino). Aquí va después de la tabla.
 * Las URLs salen con la URL pública del sitio: detrás de IIS (ARR) el host interno es 127.0.0.1.
 * BD-094 agrega aquí el mapa estático de Joomla; BD-115, la comprobación de la cookie del admin.
 */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const target = await redirectStore.find(pathname, search);
  if (target) {
    redirectHits.record(target.fromPath);
    return NextResponse.redirect(new URL(target.to, SITE.url), target.status);
  }

  if (pathname.length > 1 && pathname.endsWith("/")) {
    // Una sola «/» al inicio: «//otro.com/» nunca debe volverse un destino de otro sitio.
    const clean = `/${pathname.replace(/^\/+|\/+$/g, "")}`;
    return NextResponse.redirect(new URL(`${clean}${search}`, SITE.url), 308);
  }

  return NextResponse.next();
}

export const config = {
  // Todo menos los archivos del build y los medios (los sirve IIS). Las extensiones no se
  // excluyen: BD-094 redirige imágenes viejas de Joomla (/images/stories/…).
  matcher: ["/((?!_next/|media/|favicon.ico$).*)"],
};
