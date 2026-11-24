import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { object } from "zod/mini";
import { fieldErrors, requiredText } from "@/lib/form-schemas-mini";

// El camino común de los formularios de BD-076: trampa, tiempo, validación, límite por IP y cupo.
const mocks = vi.hoisted(() => ({ count: vi.fn(), ip: vi.fn(), warn: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("@/server/request-ip", () => ({ requestIpHash: mocks.ip }));
vi.mock("@/server/data/form-requests", () => ({
  RequestRateLimitError: class RequestRateLimitError extends Error {},
  countRecentRequestsByIp: mocks.count,
}));
vi.mock("@/server/log", () => ({ log: { warn: mocks.warn }, logError: () => "REF12345" }));

const { fakeFolio, submitGuardedForm } = await import("./form-submit");
const { RequestRateLimitError } = await import("@/server/data/form-requests");
const { formRateLimiter } = await import("@/server/rate-limit");
const { FOLIO_REGEX } = await import("@/lib/folio");

const schema = object({ name: requiredText(20) });
const meta = { website: "", elapsedMs: 10_000 };
const save = vi.fn();
const run = (overrides: Partial<Parameters<typeof submitGuardedForm>[0]> = {}) =>
  submitGuardedForm({
    form: "contact",
    meta,
    values: { name: "Ana" },
    schema,
    errors: (values) => fieldErrors<"name">(schema, values),
    fake: () => "falso",
    save,
    ...overrides,
  });

beforeEach(() => {
  formRateLimiter("contact").reset();
  mocks.ip.mockResolvedValue("a".repeat(64));
  mocks.count.mockResolvedValue(0);
  save.mockResolvedValue({ ok: true, data: "guardado" });
});
afterEach(() => vi.clearAllMocks());

describe("submitGuardedForm (BD-076)", () => {
  it("guarda con los datos validados y el hash de la IP", async () => {
    expect(await run({ values: { name: "  Ana  " } })).toEqual({ ok: true, data: "guardado" });
    expect(save).toHaveBeenCalledWith({ name: "Ana" }, "a".repeat(64));
  });

  it("campo trampa lleno: éxito falso sin consultar la base ni guardar", async () => {
    expect(await run({ meta: { website: "spam.com", elapsedMs: 10_000 } })).toEqual({
      ok: true,
      data: "falso",
    });
    expect(save).not.toHaveBeenCalled();
    expect(mocks.count).not.toHaveBeenCalled();
    expect(mocks.warn).toHaveBeenCalled();
  });

  it("antes del tiempo mínimo: tooFast", async () => {
    expect(await run({ meta: { website: "", elapsedMs: 500 } })).toEqual({
      ok: false,
      error: "tooFast",
    });
  });

  it("datos inválidos: invalid con el error de cada campo", async () => {
    expect(await run({ values: { name: "" } })).toEqual({
      ok: false,
      error: "invalid",
      fields: { name: "Este dato es necesario" },
    });
    expect(save).not.toHaveBeenCalled();
  });

  it("el sexto envío en memoria no llega a la base", async () => {
    for (let i = 0; i < 5; i++) expect((await run()).ok).toBe(true);
    expect(await run()).toEqual({ ok: false, error: "rateLimited" });
    expect(save).toHaveBeenCalledTimes(5);
    expect(mocks.count).toHaveBeenCalledTimes(5);
  });

  it("la cuenta de la base también limita (tras un reinicio) y la memoria se pone al día", async () => {
    mocks.count.mockResolvedValue(5);
    for (let i = 0; i < 5; i++) expect(await run()).toEqual({ ok: false, error: "rateLimited" });
    expect(save).not.toHaveBeenCalled();
    expect(mocks.count).toHaveBeenCalledTimes(5);
    // El sexto ya lo frena la memoria, sin consultar la base.
    expect(await run()).toEqual({ ok: false, error: "rateLimited" });
    expect(mocks.count).toHaveBeenCalledTimes(5);
  });

  it("meta null no tumba la acción: cuenta como envío sin tiempo", async () => {
    expect(await run({ meta: null as never })).toEqual({ ok: false, error: "tooFast" });
  });

  it("un fallo y un rechazo por datos devuelven el cupo; el límite de la transacción, no", async () => {
    save.mockRejectedValueOnce(new RequestRateLimitError());
    expect(await run()).toEqual({ ok: false, error: "rateLimited" });
    save.mockRejectedValueOnce(new Error("sin base"));
    expect(await run()).toEqual({ ok: false, error: "unavailable", reference: "REF12345" });
    save.mockResolvedValueOnce({ ok: false, error: "invalid", fields: {} });
    expect((await run()).ok).toBe(false);
    // Solo el primero gastó cupo: quedan cuatro.
    for (let i = 0; i < 4; i++) expect((await run()).ok).toBe(true);
    expect((await run()).ok).toBe(false);
  });

  it("sin poder leer la IP: unavailable con referencia", async () => {
    mocks.ip.mockRejectedValue(new Error("sin cabeceras"));
    expect(await run()).toEqual({ ok: false, error: "unavailable", reference: "REF12345" });
  });

  it("el folio falso tiene el formato y el año de Guatemala", () => {
    const folio = fakeFolio("ESC", new Date("2027-03-01T12:00:00Z"));
    expect(folio).toMatch(FOLIO_REGEX);
    expect(folio.startsWith("ESC-2027-")).toBe(true);
  });
});
