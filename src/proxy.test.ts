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

beforeEach(() => {
  find.mockReset();
  record.mockReset();
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
