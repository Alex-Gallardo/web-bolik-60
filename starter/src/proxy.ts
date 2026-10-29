/**
 * proxy.ts (Next.js 16+; en versiones anteriores se llamaba middleware.ts)
 * 1) Redirecciones 301 del sitio Joomla anterior (mapa estático, rápido, sin BD).
 * 2) Protección básica de /admin (la verificación real de sesión y rol se repite en cada
 *    Server Action y página del admin: nunca confiar solo en el proxy).
 * Las redirecciones creadas desde el admin (tabla Redirect) se resuelven en not-found.tsx
 * para no consultar la BD en cada petición.
 */
import { NextResponse, type NextRequest } from "next/server";
import { LEGACY_PATHS, LEGACY_VM_PRODUCTS, LEGACY_VM_CATEGORIES } from "@/features/seo/legacy-redirects";

const SESSION_COOKIE = "bolik_admin";

export function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // ── 1. Joomla: /index.php?option=com_virtuemart&view=productdetails&virtuemart_product_id=17 …
  if (pathname === "/index.php" || pathname.startsWith("/index.php/")) {
    const target = resolveLegacy(pathname, searchParams);
    return redirect301(request, target ?? "/");
  }
  if (pathname.startsWith("/component/virtuemart/")) {
    const slug = decodeURIComponent(pathname.split("/").filter(Boolean).at(-1) ?? "").toLowerCase();
    return redirect301(request, LEGACY_PATHS[`/component/virtuemart/${slug}`] ?? "/productos");
  }

  // ── 2. Admin sin cookie → login (excepto la propia página de login)
  if (pathname.startsWith("/admin") && pathname !== "/admin/login" && !request.cookies.has(SESSION_COOKIE)) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

function resolveLegacy(pathname: string, sp: URLSearchParams): string | null {
  // Rutas amigables de Joomla: /index.php/productos, /index.php/boligrafos, /index.php/contactenos…
  const exact = LEGACY_PATHS[decodeURIComponent(pathname).toLowerCase().replace(/\/+$/, "")];
  if (exact) return exact;

  // VirtueMart por parámetros
  if (sp.get("option") === "com_virtuemart") {
    const productId = sp.get("virtuemart_product_id");
    if (productId && LEGACY_VM_PRODUCTS[productId]) return LEGACY_VM_PRODUCTS[productId];
    const categoryId = sp.get("virtuemart_category_id");
    if (categoryId && LEGACY_VM_CATEGORIES[categoryId]) return LEGACY_VM_CATEGORIES[categoryId];
    return "/productos";
  }
  // Artículos de contenido (Itemid / id)
  if (sp.get("option") === "com_content") return "/nuestra-historia";
  return null;
}

function redirect301(request: NextRequest, path: string) {
  const url = new URL(path, request.nextUrl.origin);
  // Conserva UTM si venían en la URL vieja
  for (const [k, v] of request.nextUrl.searchParams) if (k.startsWith("utm_")) url.searchParams.set(k, v);
  return NextResponse.redirect(url, 301);
}

export const config = {
  matcher: ["/index.php", "/index.php/:path*", "/component/:path*", "/admin/:path*"],
};
