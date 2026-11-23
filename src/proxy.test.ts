// @vitest-environment node
import { NextRequest } from "next/server";
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { config, proxy } from "./proxy";

const find = vi.fn();
const record = vi.fn();
vi.mock("@/server/seo/redirects", () => ({
  redirectStore: { find: (...args: unknown[]) => find(...args) },
  redirectHits: { record: (...args: unknown[]) => record(...args) },
}));
vi.mock("@/features/seo/metadata", () => ({ SITE: { url: "https://www.bolik66.com" } }));
const appEnv = vi.hoisted(() => ({
  APP_ENV: "development" as "development" | "staging" | "production",
}));
vi.mock("@/env", () => ({ env: appEnv }));
const exists = vi.fn();
const resolveCode = vi.fn();
vi.mock("@/server/seo/catalog-routes", () => ({
  catalogRouteStore: {
    exists: (...args: unknown[]) => exists(...args),
    resolveCode: (...args: unknown[]) => resolveCode(...args),
  },
}));

beforeEach(() => {
  find.mockReset();
  record.mockReset();
  exists.mockReset();
  exists.mockResolvedValue(true);
  resolveCode.mockReset();
  resolveCode.mockResolvedValue({ status: "missing" });
  find.mockResolvedValue(null);
  appEnv.APP_ENV = "development";
});

const ULTRA_AZUL = { path: "/productos/boligrafos/bolik-ultra", color: "azul" };

describe("proxy: acceso por QR /p/{codigo} (BD-065)", () => {
  it("un código que existe responde 301 a su ficha con el color y la UTM del empaque", async () => {
    find.mockResolvedValue(null);
    resolveCode.mockResolvedValue({ status: "found", target: ULTRA_AZUL });
    const response = await proxy(
      new NextRequest("http://127.0.0.1:3000/p/PT00058?utm_campaign=escolar&otro=x"),
    );
    expect(resolveCode).toHaveBeenCalledWith("PT00058");
    expect(response.status).toBe(301);
    expect(response.headers.get("location")).toBe(
      "https://www.bolik66.com/productos/boligrafos/bolik-ultra?color=azul&utm_source=qr&utm_medium=empaque&utm_campaign=escolar",
    );
    // Se guarda una hora, no para siempre: un código puede cambiar de ficha.
    expect(response.headers.get("cache-control")).toBe("public, max-age=3600");
  });

  it("un código que no existe va a la 404 (estado 404 real)", async () => {
    find.mockResolvedValue(null);
    const response = await proxy(new NextRequest("http://127.0.0.1:3000/p/NO-EXISTE"));
    expect(resolveCode).toHaveBeenCalledWith("NO-EXISTE");
    expect(response.headers.get("x-middleware-rewrite")).toMatch(/\/_no-existe$/);
  });

  it("con barra final va directo a la ficha, sin el 308 de la barra", async () => {
    find.mockResolvedValue(null);
    resolveCode.mockResolvedValue({ status: "found", target: ULTRA_AZUL });
    const response = await proxy(new NextRequest("http://127.0.0.1:3000/p/PT00058/"));
    expect(response.status).toBe(301);
    expect(resolveCode).toHaveBeenCalledWith("PT00058");
  });

  it("sin lista (base caída) un 302 temporal al catálogo, nunca «no existe»", async () => {
    find.mockResolvedValue(null);
    resolveCode.mockResolvedValue({ status: "unavailable" });
    const response = await proxy(new NextRequest("http://127.0.0.1:3000/p/PT00058"));
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("https://www.bolik66.com/productos");
  });

  it("una fila de Redirect sobre /p/… gana al QR", async () => {
    find.mockResolvedValue({ to: "/contacto", status: 301, fromPath: "/p/VIEJO" });
    const response = await proxy(new NextRequest("http://127.0.0.1:3000/p/VIEJO"));
    expect(response.headers.get("location")).toBe("https://www.bolik66.com/contacto");
    expect(resolveCode).not.toHaveBeenCalled();
  });

  it("/p sin código o con más segmentos no es un QR", async () => {
    find.mockResolvedValue(null);
    await proxy(new NextRequest("http://127.0.0.1:3000/p"));
    await proxy(new NextRequest("http://127.0.0.1:3000/p/PT00058/x"));
    expect(resolveCode).not.toHaveBeenCalled();
  });
});

describe("proxy: rutas del catálogo (BD-061)", () => {
  it("un slug del catálogo que no existe se reescribe a la 404 (estado 404 real)", async () => {
    find.mockResolvedValue(null);
    exists.mockResolvedValue(false);
    const response = await proxy(new NextRequest("http://127.0.0.1:3000/productos/no-existe"));
    expect(exists).toHaveBeenCalledWith("/productos/no-existe");
    expect(response.headers.get("x-middleware-rewrite")).toMatch(/\/_no-existe$/);
  });

  it("uno que existe sigue su camino", async () => {
    find.mockResolvedValue(null);
    const response = await proxy(new NextRequest("http://127.0.0.1:3000/productos/marcadores"));
    expect(response.headers.get("x-middleware-rewrite")).toBeNull();
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });
});

describe("proxy (BD-046)", () => {
  it("responde 301 a la URL pública del sitio y cuenta el uso", async () => {
    find.mockResolvedValue({ to: "/contacto", status: 301, fromPath: "/index.php/contactenos" });
    const response = await proxy(
      new NextRequest("http://127.0.0.1:3000/index.php/contactenos?x=1"),
    );
    expect(find).toHaveBeenCalledWith("/index.php/contactenos", "?x=1");
    expect(response.status).toBe(301);
    expect(response.headers.get("location")).toBe("https://www.bolik66.com/contacto");
    expect(record).toHaveBeenCalledWith("/index.php/contactenos");
  });

  it("respeta el estado guardado (308)", async () => {
    find.mockResolvedValue({ to: "/nuevo", status: 308, fromPath: "/viejo" });
    const response = await proxy(new NextRequest("http://127.0.0.1:3000/viejo"));
    expect(response.status).toBe(308);
  });

  it("sin redirección, la petición sigue", async () => {
    find.mockResolvedValue(null);
    const response = await proxy(new NextRequest("http://127.0.0.1:3000/productos"));
    expect(response.headers.get("x-middleware-next")).toBe("1");
    expect(record).not.toHaveBeenCalled();
  });

  it("no corre en los archivos del build ni en los medios, sí en rutas viejas", () => {
    const matches = (url: string) => unstable_doesMiddlewareMatch({ config, url });
    expect(matches("/_next/static/chunks/app.js")).toBe(false);
    expect(matches("/media/products/ultra-640.webp")).toBe(false);
    expect(matches("/index.php/productos")).toBe(true);
    expect(matches("/images/stories/virtuemart/product/ultra.jpg")).toBe(true);
    expect(matches("/")).toBe(true);
  });

  it("quita la barra final con un solo 308, después de buscar en la tabla", async () => {
    find.mockResolvedValue(null);
    const response = await proxy(new NextRequest("http://127.0.0.1:3000/productos/?x=1"));
    expect(find).toHaveBeenCalledWith("/productos/", "?x=1");
    expect(response.status).toBe(308);
    expect(response.headers.get("location")).toBe("https://www.bolik66.com/productos?x=1");
  });

  it("una URL vieja con barra va directo al destino (un solo salto)", async () => {
    find.mockResolvedValue({ to: "/contacto", status: 301, fromPath: "/viejo" });
    const response = await proxy(new NextRequest("http://127.0.0.1:3000/viejo/"));
    expect(response.status).toBe(301);
    expect(response.headers.get("location")).toBe("https://www.bolik66.com/contacto");
  });

  it("«//otro.com/» nunca se vuelve un destino de otro sitio", async () => {
    find.mockResolvedValue(null);
    const response = await proxy(new NextRequest("http://127.0.0.1:3000//otro.com/"));
    expect(new URL(response.headers.get("location")!).host).toBe("www.bolik66.com");
  });
});

describe("proxy: /buscar?q= a la página que pinta los resultados en el servidor (BD-066)", () => {
  const rewriteOf = async (url: string) => {
    find.mockResolvedValue(null);
    const response = await proxy(new NextRequest(url));
    const target = response.headers.get("x-middleware-rewrite");
    return target ? new URL(target).pathname : null;
  };

  it("reescribe a /buscar/-{consulta}; la URL del visitante no cambia", async () => {
    expect(await rewriteOf("http://127.0.0.1:3000/buscar?q=ultra")).toBe("/buscar/-ultra");
    expect(await rewriteOf("http://127.0.0.1:3000/buscar?q=%20cray%C3%B3n%20")).toBe(
      "/buscar/-cray%C3%B3n",
    );
  });

  it("sin consulta, o solo espacios, sigue a /buscar (la página estática)", async () => {
    expect(await rewriteOf("http://127.0.0.1:3000/buscar")).toBeNull();
    expect(await rewriteOf("http://127.0.0.1:3000/buscar?q=%20%20")).toBeNull();
  });

  it("«.» o «..» no se vuelven segmentos de ruta (el prefijo los deja como nombre)", async () => {
    expect(await rewriteOf("http://127.0.0.1:3000/buscar?q=..")).toBe("/buscar/-..");
    expect(await rewriteOf("http://127.0.0.1:3000/buscar?q=.")).toBe("/buscar/-.");
    expect(await rewriteOf("http://127.0.0.1:3000/buscar?q=a%2Fb")).toBe("/buscar/-a%2Fb");
  });

  it("corta en 100 caracteres sin partir un emoji (no responde 500)", async () => {
    const long = `${"a".repeat(99)}✏️🙂`;
    const path = await rewriteOf(`http://127.0.0.1:3000/buscar?q=${encodeURIComponent(long)}`);
    expect(decodeURIComponent(path!.slice("/buscar/-".length))).toBe(`${"a".repeat(99)}✏`);
  });
});

describe("proxy: admin (BD-114)", () => {
  it("sin cookie, /admin/* va al login con la ruta de vuelta y noindex", async () => {
    const response = await proxy(new NextRequest("http://127.0.0.1:3000/admin/productos?orden=a"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://www.bolik66.com/admin/login?siguiente=%2Fadmin%2Fproductos%3Forden%3Da",
    );
    expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow");
  });

  it("el login no necesita cookie; con cookie pasa la ruta pedida a la página", async () => {
    const login = await proxy(new NextRequest("http://127.0.0.1:3000/admin/login"));
    expect(login.headers.get("location")).toBeNull();
    const withCookie = await proxy(
      new NextRequest("http://127.0.0.1:3000/admin", { headers: { cookie: "bolik_admin=x" } }),
    );
    expect(withCookie.headers.get("location")).toBeNull();
    expect(withCookie.headers.get("x-middleware-request-x-bolik-path")).toBe("/admin");
  });

  it("fuera del admin quita la cabecera x-bolik-path que mande el cliente", async () => {
    const response = await proxy(
      new NextRequest("http://127.0.0.1:3000/productos", {
        headers: { "x-bolik-path": "/admin/otra" },
      }),
    );
    // Next reescribe las cabeceras de la petición sin la que se quitó.
    expect(response.headers.has("x-middleware-override-headers")).toBe(true);
    expect(response.headers.get("x-middleware-request-x-bolik-path")).toBeNull();
  });
});

describe("proxy: /styleguide en producción (BD-026, BD-114)", () => {
  it("sin la cookie del admin responde la 404 real", async () => {
    appEnv.APP_ENV = "production";
    for (const path of ["/styleguide", "/styleguide/correos"]) {
      const response = await proxy(new NextRequest(`http://127.0.0.1:3000${path}`));
      expect(response.headers.get("x-middleware-rewrite"), path).toMatch(/\/_no-existe$/);
    }
  });

  it("con cookie decide el layout; en desarrollo y staging se ve siempre", async () => {
    appEnv.APP_ENV = "production";
    const withCookie = await proxy(
      new NextRequest("http://127.0.0.1:3000/styleguide", { headers: { cookie: "bolik_admin=x" } }),
    );
    expect(withCookie.headers.get("x-middleware-rewrite")).toBeNull();
    for (const env of ["development", "staging"] as const) {
      appEnv.APP_ENV = env;
      const response = await proxy(new NextRequest("http://127.0.0.1:3000/styleguide"));
      expect(response.headers.get("x-middleware-rewrite"), env).toBeNull();
    }
  });
});
