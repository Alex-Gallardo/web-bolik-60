import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/env";
import { SITE } from "@/features/seo/metadata";
import {
  ADMIN_COOKIE,
  ADMIN_HOME_PATH,
  ADMIN_LOGIN_PATH,
  ADMIN_PATH_HEADER,
  loginUrl,
} from "@/lib/admin-access";
import { STORES_PATH, storesDepartmentTarget } from "@/features/stores/directory";
import { clampQuery, searchRewritePath } from "@/lib/search-query";
import { catalogRouteStore } from "@/server/seo/catalog-routes";
import { redirectHits, redirectStore } from "@/server/seo/redirects";

/**
 * Proxy (Next 16, antes middleware), BD-046:
 * 1. Redirecciones de la tabla Redirect con 301 (o el estado guardado) en un solo salto
 *    (docs/10 §6). El mapa vive en memoria (server/seo/redirects.ts): ninguna petición espera a la
 *    base, salvo las primeras tras arrancar.
 * 2. La barra final: `skipTrailingSlashRedirect` desactiva la de Next, que corría antes que el
 *    proxy y hacía dos saltos (`/viejo/` → `/viejo` → destino). Aquí va después de la tabla.
 * Las URLs salen con la URL pública del sitio: detrás de IIS (ARR) el host interno es 127.0.0.1.
 * 3. Rutas del catálogo (BD-061): /productos/{slug} que no está publicado responde 404 de verdad (la
 *    página, con Cache Components, ya habría enviado el layout con 200). Se reescribe a una ruta
 *    que no existe: Next pinta su 404 con estado 404.
 * 4. Acceso por QR (BD-065): /p/{SKU o código de barras} responde 301 a la ficha con su color
 *    (?color=…&utm_source=qr&utm_medium=empaque, docs/06 §3.5); un código que no existe, a la 404
 *    amigable con estado 404. Usa la misma lista en memoria que las rutas del catálogo.
 * 5. Buscador (BD-066): /buscar?q=… se reescribe a /buscar/{q}, una página que se pinta completa en
 *    el servidor. Con ?q= en la misma página, Cache Components mandaría los resultados aparte (en un
 *    bloque oculto que solo muestra el JS) y sin JS no se verían. La URL del visitante no cambia.
 * 6. Admin (BD-114, ADR-08): sin la cookie bolik_admin, /admin/* (menos el login) redirige al login
 *    con la ruta de vuelta. Solo mira que exista: la sesión y el rol se validan en cada página y
 *    acción con requireRole (src/server/auth/guards.ts). Pasa la ruta pedida en `x-bolik-path`
 *    para que requireRole vuelva a ella si la sesión ya venció.
 * 7. /styleguide en producción sin la cookie (BD-026): 404 real aquí, porque el layout decide
 *    dentro de un <Suspense> y ahí la respuesta ya salió con 200. Con cookie, decide el layout.
 * 8. Dónde comprar (BD-080, BD-082): /donde-comprar?departamento={slug}, el formulario GET de la
 *    home y el de /donde-comprar sin JS, da un 308 a /donde-comprar/{slug}, la página del
 *    departamento: la página es estática y no lee la query; con Cache-Control de 1 h, porque el
 *    destino depende de los datos. Un departamento sin tiendas no tiene página (404): un 307 a
 *    /donde-comprar#{slug}, la lista con su aviso; sin la lista en memoria, un 307 a su página.
 * `x-bolik-path` solo la pone este proxy: si la manda el cliente fuera del admin, se quita.
 * BD-094 agrega aquí el mapa estático de Joomla.
 */
/** /p/{codigo}, con o sin barra final: el código del empaque (BD-065). */
const QR_PATH = /^\/p\/([^/]+)\/?$/;

/**
 * El 301 del QR se guarda una hora, no para siempre (un 301 sin Cache-Control queda en el
 * navegador sin fecha): si un código cambia de ficha, quien ya lo escaneó llega a la nueva.
 */
const QR_CACHE = "public, max-age=3600";

/**
 * /p/{codigo} (BD-065): 301 a la ficha con su color y la UTM del empaque (y las utm_* que traiga
 * el QR, como utm_campaign); un código que no existe, la 404 amigable. Si la lista no cargó (base
 * caída), un 302 temporal al catálogo: un QR válido nunca debe decir «no existe».
 */
async function qrRedirect(request: NextRequest, segment: string) {
  const result = await catalogRouteStore.resolveCode(segment);
  if (result.status === "missing") return NextResponse.rewrite(new URL("/_no-existe", request.url));
  if (result.status === "unavailable") {
    return NextResponse.redirect(new URL("/productos", SITE.url), 302);
  }
  const url = new URL(result.target.path, SITE.url);
  url.searchParams.set("color", result.target.color);
  url.searchParams.set("utm_source", "qr");
  url.searchParams.set("utm_medium", "empaque");
  for (const [key, value] of request.nextUrl.searchParams) {
    if (/^utm_(?!source$|medium$)[a-z_]+$/.test(key)) url.searchParams.set(key, value);
  }
  const response = NextResponse.redirect(url, 301);
  response.headers.set("Cache-Control", QR_CACHE);
  return response;
}

/** /admin/*: sin cookie, al login (que no la necesita); con cookie, sigue con la ruta en la cabecera. */
function adminGate(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (pathname === ADMIN_LOGIN_PATH) return NextResponse.next();
  if (!request.cookies.has(ADMIN_COOKIE)) {
    const response = NextResponse.redirect(
      new URL(loginUrl(`${pathname}${search}`), SITE.url),
      307,
    );
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
    return response;
  }
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(ADMIN_PATH_HEADER, `${pathname}${search}`);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const target = await redirectStore.find(pathname, search);
  if (target) {
    redirectHits.record(target.fromPath);
    return NextResponse.redirect(new URL(target.to, SITE.url), target.status);
  }

  // Antes de quitar la barra final: un lector que agrega «/» no da dos saltos.
  const qr = QR_PATH.exec(pathname);
  if (qr) return qrRedirect(request, qr[1]!);

  if (pathname.length > 1 && pathname.endsWith("/")) {
    // Una sola «/» al inicio: «//otro.com/» nunca debe volverse un destino de otro sitio.
    const clean = `/${pathname.replace(/^\/+|\/+$/g, "")}`;
    return NextResponse.redirect(new URL(`${clean}${search}`, SITE.url), 308);
  }

  if (pathname === "/buscar") {
    const q = clampQuery(request.nextUrl.searchParams.get("q") ?? "");
    if (q) return NextResponse.rewrite(new URL(searchRewritePath(q), request.url));
  }

  if (pathname === STORES_PATH) {
    const params = request.nextUrl.searchParams;
    if (params.has("departamento")) {
      const pages = await catalogRouteStore.departmentPages();
      const target = storesDepartmentTarget(params, (slug) => (pages ? pages.has(slug) : null));
      if (target) {
        // 308 con caché corta (como el QR): el destino depende de los datos. Sin página o sin la
        // lista, 307: no se guarda.
        const response = NextResponse.redirect(
          new URL(target.location, SITE.url),
          target.permanent ? 308 : 307,
        );
        if (target.permanent) response.headers.set("Cache-Control", QR_CACHE);
        return response;
      }
    }
  }

  if (pathname === ADMIN_HOME_PATH || pathname.startsWith(`${ADMIN_HOME_PATH}/`)) {
    return adminGate(request);
  }

  const isStyleguide = pathname === "/styleguide" || pathname.startsWith("/styleguide/");
  if (isStyleguide && env.APP_ENV === "production" && !request.cookies.has(ADMIN_COOKIE)) {
    return NextResponse.rewrite(new URL("/_no-existe", request.url));
  }

  if (!(await catalogRouteStore.exists(pathname))) {
    return NextResponse.rewrite(new URL("/_no-existe", request.url));
  }

  if (request.headers.has(ADMIN_PATH_HEADER)) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.delete(ADMIN_PATH_HEADER);
    return NextResponse.next({ request: { headers: requestHeaders } });
  }
  return NextResponse.next();
}

export const config = {
  // Todo menos los archivos del build y los medios (los sirve IIS). Las extensiones no se
  // excluyen: BD-094 redirige imágenes viejas de Joomla (/images/stories/…).
  matcher: ["/((?!_next/|media/|favicon.ico$).*)"],
};
