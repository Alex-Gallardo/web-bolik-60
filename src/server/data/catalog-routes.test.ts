import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/env", () => ({ env: { DATA_SOURCE: "fixtures" } }));
vi.mock("./proxy-db", () => ({ proxyDb: vi.fn() }));

const { listPublishedCatalogRoutes } = await import("./catalog-routes");

describe("rutas y códigos del catálogo para el proxy, con fixtures (BD-061, BD-062, BD-065)", () => {
  it("trae las fichas visibles y los códigos de sus variantes, SKU antes que códigos de barras", async () => {
    const routes = await listPublishedCatalogRoutes();
    expect(routes.products).toContain("boligrafos/bolik-ultra");
    const codes = routes.codes.map(([code]) => code);
    expect(codes).toEqual(expect.arrayContaining(["PT00058", "759364663092", "PT00060"]));
    // Todos los SKU van antes que el primer código de barras.
    const firstBarcode = codes.findIndex((code) => /^\d+$/.test(code));
    expect(codes.slice(firstBarcode).every((code) => /^\d+$/.test(code))).toBe(true);
    expect(Object.fromEntries(routes.codes)["759364663108"]).toEqual({
      path: "/productos/boligrafos/bolik-ultra",
      color: "negro",
    });
    // Ninguna ficha sin publicar aporta códigos.
    const paths = new Set(
      routes.codes.map(([, target]) => target.path.replace(/^\/productos\//, "")),
    );
    expect([...paths].every((path) => routes.products.includes(path))).toBe(true);
  });
});
