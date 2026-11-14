import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/server/data/catalog-routes", () => ({ listPublishedCategorySlugs: vi.fn() }));
vi.mock("@/server/log", () => ({ log: { error: vi.fn() } }));

const { createCatalogRouteStore } = await import("./catalog-routes");

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("rutas del catálogo para el proxy (BD-061)", () => {
  it("solo los slugs publicados existen; las demás rutas pasan", async () => {
    const store = createCatalogRouteStore({
      load: async () => ({ categories: ["marcadores", "boligrafos"] }),
    });
    expect(await store.exists("/productos/marcadores")).toBe(true);
    expect(await store.exists("/productos/no-existe")).toBe(false);
    expect(await store.exists("/productos/Marcadores")).toBe(false); // URLs en minúsculas
    // Otras rutas (y las fichas, hasta BD-062) no se tocan.
    expect(await store.exists("/productos")).toBe(true);
    expect(await store.exists("/productos/marcadores/fabik-pizarra")).toBe(true);
    expect(await store.exists("/escuelas")).toBe(true);
  });

  it("una URL mal codificada es 404, no un error", async () => {
    const store = createCatalogRouteStore({ load: async () => ({ categories: ["marcadores"] }) });
    expect(await store.exists("/productos/%")).toBe(false);
    expect(await store.exists("/productos/%E0%A4%A")).toBe(false);
  });

  it("la primera carga se espera una sola vez, como mucho el tiempo límite", async () => {
    vi.useFakeTimers();
    try {
      const load = vi.fn(() => new Promise<{ categories: string[] }>(() => {})); // no responde
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
        return { categories: slugs };
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
});
