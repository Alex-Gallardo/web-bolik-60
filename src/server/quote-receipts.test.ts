import { beforeEach, describe, expect, it, vi } from "vitest";

// Cookie de los folios enviados (BD-075): cifrada, con los últimos 5 y solo para /cotizacion.
const state = vi.hoisted(() => ({
  jar: new Map<string, { value: string; options?: Record<string, unknown> }>(),
  appEnv: "production",
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => {
      const cookie = state.jar.get(name);
      return cookie ? { name, value: cookie.value } : undefined;
    },
    set: (name: string, value: string, options?: Record<string, unknown>) =>
      void state.jar.set(name, { value, options }),
  }),
}));
vi.mock("@/env", () => ({
  env: {
    SESSION_SECRET: "una-clave-de-prueba-de-32-caracteres-o-mas",
    get APP_ENV() {
      return state.appEnv;
    },
  },
}));

const { QUOTE_RECEIPT_COOKIE, QUOTE_RECEIPT_MAX, readQuoteReceipts, rememberQuoteReceipt } =
  await import("./quote-receipts");

const folio = (n: number) => `COT-2026-${String(n).padStart(6, "0")}`;

beforeEach(() => {
  state.jar.clear();
  state.appEnv = "production";
});

describe("folios enviados desde este navegador (BD-075)", () => {
  it("sin cookie no hay folios", async () => {
    expect(await readQuoteReceipts()).toEqual([]);
  });

  it("guarda el folio cifrado: no se lee en claro", async () => {
    await rememberQuoteReceipt(folio(7));
    expect(await readQuoteReceipts()).toEqual([folio(7)]);
    expect(state.jar.get(QUOTE_RECEIPT_COOKIE)?.value).not.toContain("COT");
  });

  it("el más reciente primero, sin repetir, y solo los últimos 5", async () => {
    for (let n = 1; n <= QUOTE_RECEIPT_MAX + 2; n++) await rememberQuoteReceipt(folio(n));
    await rememberQuoteReceipt(folio(5));
    expect(await readQuoteReceipts()).toEqual([folio(5), folio(7), folio(6), folio(4), folio(3)]);
  });

  it("una cookie dañada o inventada cuenta como vacía", async () => {
    state.jar.set(QUOTE_RECEIPT_COOKIE, { value: "Fe26.2**inventada" });
    expect(await readQuoteReceipts()).toEqual([]);
    state.jar.set(QUOTE_RECEIPT_COOKIE, { value: JSON.stringify({ folios: [folio(1)] }) });
    expect(await readQuoteReceipts()).toEqual([]);
  });

  it("un sello válido con folios mal formados o de otro uso no aporta folios", async () => {
    const { sealData } = await import("iron-session");
    const password = "una-clave-de-prueba-de-32-caracteres-o-mas";
    const seal = (data: object) => sealData(data, { password });
    state.jar.set(QUOTE_RECEIPT_COOKIE, {
      value: await seal({ kind: "quote-receipts", folios: ["<script>", 1, folio(3), "COT-26-1"] }),
    });
    expect(await readQuoteReceipts()).toEqual([folio(3)]);
    // Un sello de la sesión del admin (misma clave) no sirve como lista de folios.
    state.jar.set(QUOTE_RECEIPT_COOKIE, { value: await seal({ folios: [folio(3)], userId: 1 }) });
    expect(await readQuoteReceipts()).toEqual([]);
  });

  it("pasados 7 días la cookie ya no vale", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    try {
      vi.setSystemTime(new Date("2026-11-01T12:00:00Z"));
      await rememberQuoteReceipt(folio(1));
      vi.setSystemTime(new Date("2026-11-07T12:00:00Z"));
      expect(await readQuoteReceipts()).toEqual([folio(1)]);
      vi.setSystemTime(new Date("2026-11-08T13:00:00Z"));
      expect(await readQuoteReceipts()).toEqual([]);
    } finally {
      vi.useRealTimers();
    }
  });

  it("httpOnly, sameSite=lax, solo /cotizacion, 7 días y secure fuera de desarrollo", async () => {
    await rememberQuoteReceipt(folio(1));
    expect(state.jar.get(QUOTE_RECEIPT_COOKIE)?.options).toEqual({
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/cotizacion",
      maxAge: 7 * 24 * 60 * 60,
    });
    state.appEnv = "development";
    await rememberQuoteReceipt(folio(2));
    expect(state.jar.get(QUOTE_RECEIPT_COOKIE)?.options).toMatchObject({ secure: false });
  });
});
