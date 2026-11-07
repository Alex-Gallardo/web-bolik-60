// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import type { RedirectRow } from "@/lib/redirect-path";
import { createRedirectStore } from "./redirects";

vi.mock("@/server/log", () => ({ log: { warn: vi.fn(), error: vi.fn() } }));
vi.mock("@/server/data/redirects", () => ({ listActiveRedirects: vi.fn() }));
vi.mock("@/server/data/seo-logs", () => ({ writeRedirectHits: vi.fn() }));

const rows: RedirectRow[] = [{ fromPath: "/Viejo/", toPath: "/nuevo", statusCode: 301 }];

describe("createRedirectStore (BD-046)", () => {
  it("encuentra la redirección con la ruta normalizada", async () => {
    const store = createRedirectStore({ load: async () => rows });
    expect(await store.find("/VIEJO", "?_rsc=1")).toEqual({
      to: "/nuevo",
      status: 301,
      fromPath: "/Viejo/",
    });
    expect(await store.find("/otro")).toBeNull();
  });

  it("recarga en segundo plano al vencer el TTL, sin esperar a la base", async () => {
    let time = 0;
    const load = vi
      .fn<() => Promise<RedirectRow[]>>()
      .mockResolvedValueOnce(rows)
      .mockImplementationOnce(() => new Promise(() => {})); // la base se cuelga
    const store = createRedirectStore({ load, ttlMs: 1_000, now: () => time });
    expect(await store.find("/viejo")).not.toBeNull();
    time = 5_000;
    // La segunda carga nunca termina: la petición usa el mapa que hay y no espera.
    expect(await store.find("/viejo")).not.toBeNull();
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("la primera carga espera como mucho el tiempo límite", async () => {
    vi.useFakeTimers();
    try {
      const store = createRedirectStore({
        load: () => new Promise(() => {}),
        firstLoadTimeoutMs: 100,
      });
      const pending = store.find("/viejo");
      await vi.advanceTimersByTimeAsync(100);
      expect(await pending).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it("si la base falla, sigue con el mapa anterior y reintenta en el siguiente ciclo", async () => {
    let time = 0;
    const load = vi
      .fn<() => Promise<RedirectRow[]>>()
      .mockResolvedValueOnce(rows)
      .mockRejectedValueOnce(new Error("sin base"))
      .mockResolvedValue([]);
    const store = createRedirectStore({ load, ttlMs: 1_000, now: () => time });
    await store.find("/viejo");
    time = 2_000;
    await store.find("/viejo");
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(await store.find("/viejo")).not.toBeNull(); // el mapa anterior sigue
    time = 4_000;
    await store.find("/viejo");
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(await store.find("/viejo")).toBeNull(); // ya cargó el nuevo (vacío)
  });

  it("invalidate() fuerza la recarga (BD-123: al guardar en el admin)", async () => {
    const load = vi.fn<() => Promise<RedirectRow[]>>().mockResolvedValue(rows);
    const store = createRedirectStore({ load, ttlMs: 60_000 });
    await store.find("/viejo");
    store.invalidate();
    await store.find("/viejo");
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("en frío, todas las peticiones esperan la primera carga (no solo la primera)", async () => {
    let finish: (rows: RedirectRow[]) => void = () => {};
    const load = vi.fn<() => Promise<RedirectRow[]>>(
      () => new Promise((resolve) => (finish = resolve)),
    );
    const store = createRedirectStore({ load });
    const first = store.find("/viejo");
    const second = store.find("/viejo");
    finish(rows);
    expect(await first).not.toBeNull();
    expect(await second).not.toBeNull();
    expect(load).toHaveBeenCalledOnce();
  });

  it("si la URL trae una query que no está en la tabla, busca la ruta sola", async () => {
    const store = createRedirectStore({
      load: async () => [
        ...rows,
        { fromPath: "/index.php?option=com_contact", toPath: "/contacto", statusCode: 301 },
      ],
    });
    expect((await store.find("/viejo", "?ref=boletin"))?.to).toBe("/nuevo");
    expect((await store.find("/viejo", "?utm_source=fb&fbclid=1"))?.to).toBe("/nuevo");
    expect((await store.find("/index.php", "?option=com_contact"))?.to).toBe("/contacto");
    expect(await store.find("/index.php", "?option=otra")).toBeNull();
  });

  it("invalidate() descarta la carga en curso y lanza una nueva", async () => {
    let finishOld: (rows: RedirectRow[]) => void = () => {};
    const load = vi
      .fn<() => Promise<RedirectRow[]>>()
      .mockResolvedValueOnce([])
      .mockImplementationOnce(() => new Promise((resolve) => (finishOld = resolve)))
      .mockResolvedValueOnce(rows);
    let time = 0;
    const store = createRedirectStore({ load, ttlMs: 1_000, now: () => time });
    await store.find("/viejo"); // carga inicial: vacío
    time = 2_000;
    await store.find("/viejo"); // empieza una recarga que tarda (leyó antes del guardado)
    store.invalidate(); // el admin guarda
    expect(await store.find("/viejo")).toBeNull(); // lanza la nueva; usa el mapa que hay
    await new Promise((resolve) => setTimeout(resolve, 0));
    finishOld([]); // la vieja termina tarde: no debe pisar la nueva
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(await store.find("/viejo")).not.toBeNull();
    expect(load).toHaveBeenCalledTimes(3);
  });
});
