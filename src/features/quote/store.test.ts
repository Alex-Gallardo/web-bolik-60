import { afterEach, describe, expect, it } from "vitest";
import { QUOTE_LIMITS } from "@/lib/constants";
import {
  QUOTE_CHANGE_EVENT,
  QUOTE_STORAGE_KEY,
  QUOTE_STORAGE_VERSION,
  clampQuantity,
  quoteStorage,
  lineKey,
  sanitizeLines,
  useQuote,
  type AddInput,
} from "./store";

const ultra = (sku = "PT00058", packaging: AddInput["packaging"] = "cajilla12"): AddInput => ({
  type: "variante",
  ref: sku,
  name: "Bolik Ultra",
  detail: `Azul · ${sku}`,
  packaging,
  url: "/productos/boligrafos/bolik-ultra",
});

const state = () => useQuote.getState();
const saved = () =>
  JSON.parse(localStorage.getItem(QUOTE_STORAGE_KEY) ?? "null") as {
    state: { lines: unknown[] };
    version: number;
  } | null;

afterEach(() => {
  state().clear();
  localStorage.clear();
});

describe("store de la cotización (BD-070, docs/13 §3)", () => {
  it("agrega una línea por SKU + presentación y suma la cantidad si se repite", () => {
    const first = state().add({ ...ultra(), quantity: 20 });
    expect(first).toMatchObject({ ok: true, merged: false });
    expect(state().lines[0]).toMatchObject({
      key: "variante:PT00058:cajilla12",
      quantity: 20,
      name: "Bolik Ultra",
    });
    const again = state().add({ ...ultra(), quantity: 5 });
    expect(again).toMatchObject({ ok: true, merged: true, line: { quantity: 25 } });
    expect(state().lines).toHaveLength(1);
    // Otra presentación u otro SKU es otra línea.
    state().add(ultra("PT00058", "fardo"));
    state().add(ultra("PT00059"));
    expect(state().lines.map((l) => l.key)).toEqual([
      "variante:PT00058:cajilla12",
      "variante:PT00058:fardo",
      "variante:PT00059:cajilla12",
    ]);
    expect(lineKey("categoria", "boligrafos")).toBe("categoria:boligrafos:-");
  });

  it("la cantidad queda entre 1 y 9 999, también al sumar", () => {
    expect(clampQuantity(0)).toBe(1);
    expect(clampQuantity(-3)).toBe(1);
    expect(clampQuantity(Number.NaN)).toBe(1);
    expect(clampQuantity(2.6)).toBe(3);
    expect(clampQuantity(50_000)).toBe(QUOTE_LIMITS.maxQty);
    state().add({ ...ultra(), quantity: 9_000 });
    state().add({ ...ultra(), quantity: 5_000 });
    expect(state().lines[0]!.quantity).toBe(9_999);
    state().setQuantity("variante:PT00058:cajilla12", 0);
    expect(state().lines[0]!.quantity).toBe(1);
  });

  it("no pasa de 50 líneas: avisa con «limit» y no agrega", () => {
    for (let i = 0; i < QUOTE_LIMITS.maxLines; i++)
      state().add(ultra(`PT${String(i).padStart(5, "0")}`));
    expect(state().add(ultra("PT99999"))).toEqual({ ok: false, reason: "limit" });
    expect(state().lines).toHaveLength(QUOTE_LIMITS.maxLines);
    // Sumar a una que ya está sí se puede.
    expect(state().add(ultra("PT00000"))).toMatchObject({ ok: true, merged: true });
  });

  it("quitar guarda la línea y su lugar para deshacer", () => {
    state().add(ultra("PT00058"));
    state().add(ultra("PT00059"));
    state().add(ultra("PT00060"));
    state().remove("variante:PT00059:cajilla12");
    expect(state().lines.map((l) => l.ref)).toEqual(["PT00058", "PT00060"]);
    state().undoRemove();
    expect(state().lines.map((l) => l.ref)).toEqual(["PT00058", "PT00059", "PT00060"]);
    expect(state().lastRemoved).toBeUndefined();
    state().remove("no-existe");
    expect(state().lines).toHaveLength(3);
  });

  it("se guarda en localStorage con su versión y vaciar deja la lista en cero", () => {
    state().add({ ...ultra(), quantity: 3 });
    expect(saved()).toMatchObject({
      version: QUOTE_STORAGE_VERSION,
      state: { lines: [{ ref: "PT00058", quantity: 3 }] },
    });
    // lastRemoved no se guarda.
    state().remove("variante:PT00058:cajilla12");
    expect(Object.keys(saved()!.state)).toEqual(["lines"]);
    state().clear();
    expect(state().lines).toEqual([]);
  });

  it("recargar recupera la lista; lo dañado se descarta sin vaciar lo bueno", async () => {
    const good = { ...ultra(), key: "variante:PT00058:cajilla12", quantity: 0, addedAt: 1 };
    localStorage.setItem(
      QUOTE_STORAGE_KEY,
      JSON.stringify({ state: { lines: [good, {}, "x", null] }, version: QUOTE_STORAGE_VERSION }),
    );
    await useQuote.persist.rehydrate();
    expect(state().lines).toHaveLength(1);
    expect(state().lines[0]).toMatchObject({ ref: "PT00058", quantity: 1 });
  });

  it("una versión vieja se migra sin perder líneas (recorta a 50)", async () => {
    const lines = Array.from({ length: 60 }, (_, i) => ({
      ...ultra(`PT${String(i).padStart(5, "0")}`),
      key: `variante:PT${String(i).padStart(5, "0")}:cajilla12`,
      quantity: 2,
      addedAt: i,
    }));
    localStorage.setItem(QUOTE_STORAGE_KEY, JSON.stringify({ state: { lines }, version: 0 }));
    await useQuote.persist.rehydrate();
    expect(state().lines).toHaveLength(QUOTE_LIMITS.maxLines);
    expect(sanitizeLines("no es una lista")).toEqual([]);
  });
});

describe("casos borde del store (BD-070, revisión)", () => {
  it("deshacer no duplica una línea que se volvió a agregar ni pasa de 50", () => {
    state().add(ultra("PT00058"));
    state().remove("variante:PT00058:cajilla12");
    state().add(ultra("PT00058"));
    state().undoRemove();
    expect(state().lines.filter((l) => l.ref === "PT00058")).toHaveLength(1);

    state().clear();
    for (let i = 0; i < QUOTE_LIMITS.maxLines; i++)
      state().add(ultra(`PT${String(i).padStart(5, "0")}`));
    state().remove("variante:PT00000:cajilla12");
    state().add(ultra("PT99999"));
    state().undoRemove();
    expect(state().lines).toHaveLength(QUOTE_LIMITS.maxLines);
  });

  it("al sumar, una cantidad inválida cuenta como 1 y nunca resta", () => {
    state().add({ ...ultra(), quantity: 10 });
    state().add({ ...ultra(), quantity: -50 });
    state().add({ ...ultra(), quantity: Number.NaN });
    expect(state().lines[0]!.quantity).toBe(12);
  });

  it("vaciar se puede deshacer y deja lo guardado en cero", () => {
    state().add(ultra("PT00058"));
    state().add(ultra("PT00059"));
    state().clear();
    expect(saved()!.state.lines).toEqual([]);
    state().undoClear();
    expect(state().lines.map((l) => l.ref)).toEqual(["PT00058", "PT00059"]);
  });

  it("sanea tipo, presentación, ruta y claves repetidas", () => {
    const base = { ref: "PT00058", name: "Bolik Ultra", quantity: 2, addedAt: 0 };
    const lines = sanitizeLines([
      { ...base, type: "variante", packaging: "cajilla12", url: "/productos/x", key: "otra" },
      { ...base, type: "variante", packaging: "cajilla12", url: "/productos/x", quantity: 3 },
      { ...base, type: "juguete", url: "/x" },
      { ...base, type: "variante", packaging: "caja-rara", url: "/x" },
      { ...base, type: "variante", url: "https://otro.com" },
      { ...base, type: "variante", url: "//otro.com" },
    ]);
    expect(lines).toEqual([
      expect.objectContaining({ key: "variante:PT00058:cajilla12", quantity: 5 }),
    ]);
  });

  it("un valor que no es JSON deja la lista vacía y el siguiente cambio lo reemplaza", async () => {
    localStorage.setItem(QUOTE_STORAGE_KEY, "{dañado");
    await useQuote.persist.rehydrate();
    expect(state().lines).toEqual([]);
    state().add(ultra());
    expect(saved()!.state.lines).toHaveLength(1);
  });

  it("con localStorage bloqueado o lleno, guarda en memoria sin errores", () => {
    const blocked = quoteStorage(() => {
      throw new Error("SecurityError");
    });
    blocked.setItem("k", "v");
    expect(blocked.getItem("k")).toBe("v");
    const full = {
      setItem: (key: string) => {
        if (key !== "__bolik_probe__") throw new Error("QuotaExceededError");
      },
      getItem: () => null,
      removeItem: () => {},
    } as unknown as Storage;
    expect(() => quoteStorage(() => full).setItem("k", "v")).not.toThrow();
  });
});

describe("aviso al contador del header (BD-070)", () => {
  it("al guardar, el store avisa con el número de líneas (QUOTE_CHANGE_EVENT)", () => {
    const counts: number[] = [];
    const listener = (event: Event) => counts.push((event as CustomEvent<number>).detail);
    window.addEventListener(QUOTE_CHANGE_EVENT, listener);
    state().add(ultra("PT00058"));
    state().add(ultra("PT00059"));
    state().remove("variante:PT00058:cajilla12");
    window.removeEventListener(QUOTE_CHANGE_EVENT, listener);
    expect(counts).toEqual([1, 2, 1]);
  });
});
