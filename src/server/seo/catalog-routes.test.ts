import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/server/data/catalog-routes", () => ({ listPublishedCatalogRoutes: vi.fn() }));
vi.mock("@/server/log", () => ({ log: { error: vi.fn() } }));

const { createCatalogRouteStore } = await import("./catalog-routes");
type CatalogRoutes = import("./catalog-routes").CatalogRoutes;

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("rutas del catálogo para el proxy (BD-061)", () => {
  it("solo los slugs publicados existen; las demás rutas pasan", async () => {
    const store = createCatalogRouteStore({
      load: async () => ({ categories: ["marcadores", "boligrafos"], products: [], codes: [] }),
    });
    expect(await store.exists("/productos/marcadores")).toBe(true);
    expect(await store.exists("/productos/no-existe")).toBe(false);
    expect(await store.exists("/productos/Marcadores")).toBe(false); // URLs en minúsculas
    // Otras rutas no se tocan.
    expect(await store.exists("/productos")).toBe(true);
    expect(await store.exists("/escuelas")).toBe(true);
  });

  it("una ficha existe solo publicada y en su categoría (BD-062)", async () => {
    const store = createCatalogRouteStore({
      load: async () => ({
        categories: ["boligrafos", "marcadores"],
        products: ["boligrafos/bolik-ultra"],
        codes: [],
      }),
    });
    expect(await store.exists("/productos/boligrafos/bolik-ultra")).toBe(true);
    expect(await store.exists("/productos/boligrafos/no-existe")).toBe(false);
    expect(await store.exists("/productos/marcadores/bolik-ultra")).toBe(false);
    expect(await store.exists("/productos/boligrafos/Bolik-Ultra")).toBe(false);
    expect(await store.exists("/productos/boligrafos/%")).toBe(false);
    // Más hondo (el PDF de BD-064) lo decide su ruta.
    expect(await store.exists("/productos/boligrafos/bolik-ultra/ficha.pdf")).toBe(true);
  });

  it("una URL mal codificada es 404, no un error", async () => {
    const store = createCatalogRouteStore({
      load: async () => ({ categories: ["marcadores"], products: [], codes: [] }),
    });
    expect(await store.exists("/productos/%")).toBe(false);
    expect(await store.exists("/productos/%E0%A4%A")).toBe(false);
  });

  it("la primera carga se espera una sola vez, como mucho el tiempo límite", async () => {
    vi.useFakeTimers();
    try {
      const load = vi.fn(() => new Promise<CatalogRoutes>(() => {})); // no responde
      const store = createCatalogRouteStore({ load, firstLoadTimeoutMs: 1000 });
      const first = store.exists("/productos/x");
      const second = store.exists("/productos/y");
      await vi.advanceTimersByTimeAsync(1000);
      expect(await first).toBe(true); // sin lista no se bloquea nada
      expect(await second).toBe(true);
      // Las siguientes ya no esperan.
      expect(await store.exists("/productos/z")).toBe(true);
      expect(load).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("si una recarga falla, sigue con la lista anterior; invalidate() recarga", async () => {
    let fail = false;
    let slugs = ["marcadores"];
    let clock = 0;
    const store = createCatalogRouteStore({
      load: async () => {
        if (fail) throw new Error("sin base");
        return { categories: slugs, products: [], codes: [] };
      },
      now: () => clock,
      ttlMs: 10,
    });
    expect(await store.exists("/productos/marcadores")).toBe(true);
    fail = true;
    clock = 100;
    await store.exists("/productos/marcadores");
    await tick();
    expect(await store.exists("/productos/marcadores")).toBe(true);
    // Publicar una categoría en el admin: invalidate() y la siguiente recarga la trae.
    fail = false;
    slugs = ["marcadores", "boligrafos"];
    store.invalidate();
    await store.exists("/productos/boligrafos");
    await tick();
    expect(await store.exists("/productos/boligrafos")).toBe(true);
  });

  it("resuelve el código de /p/{codigo} por SKU o código de barras (BD-065)", async () => {
    const azul = { path: "/productos/boligrafos/bolik-ultra", color: "azul" };
    const negro = { path: "/productos/boligrafos/bolik-ultra", color: "negro" };
    const store = createCatalogRouteStore({
      load: async () => ({
        categories: ["boligrafos"],
        products: ["boligrafos/bolik-ultra"],
        codes: [
          ["PT00058", azul],
          ["759364663092", azul],
          ["PT00059", negro],
          // Un código de barras repetido: gana el primero.
          ["759364663092", negro],
        ],
      }),
    });
    expect(await store.resolveCode("PT00058")).toEqual({ status: "found", target: azul });
    expect(await store.resolveCode("pt-00059")).toEqual({ status: "found", target: negro });
    expect(await store.resolveCode("pt%2000059")).toEqual({ status: "found", target: negro });
    expect(await store.resolveCode("759364663092")).toEqual({ status: "found", target: azul });
    expect(await store.resolveCode("NO-EXISTE")).toEqual({ status: "missing" });
    expect(await store.resolveCode("x")).toEqual({ status: "missing" }); // muy corto: ni se busca
    expect(await store.resolveCode("%")).toEqual({ status: "missing" }); // mal codificado
  });

  it("sin lista (la base no respondió) no se sabe: «unavailable», no «missing»", async () => {
    const store = createCatalogRouteStore({
      load: async () => {
        throw new Error("sin base");
      },
    });
    expect(await store.resolveCode("PT00058")).toEqual({ status: "unavailable" });
  });
});
