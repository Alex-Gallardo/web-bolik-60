import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { feedback } from "@/content/feedback";

// submitQuote (BD-073) con la capa de datos simulada: el orden de los filtros, qué se guarda y que
// SAP vaya en after() solo con el interruptor encendido. Lo que toca SQL Server está en
// tests/integration/quote.test.ts.
const mocks = vi.hoisted(() => ({
  after: vi.fn(),
  count: vi.fn(),
  departmentName: vi.fn(),
  sendEmails: vi.fn(),
  resolve: vi.fn(),
  save: vi.fn(),
  sendToErp: vi.fn(),
  saveErpOutcome: vi.fn(),
  settings: vi.fn(),
}));

vi.mock("next/server", () => ({ after: mocks.after }));
vi.mock("@/server/request-ip", () => ({ requestIpHash: async () => "a".repeat(64) }));
vi.mock("@/server/data/quote-erp", () => ({ saveErpOutcome: mocks.saveErpOutcome }));
vi.mock("@/server/data/quote-requests", () => ({
  // Sin cargar el módulo real (lee el entorno): la acción solo compara con instanceof.
  QuoteRateLimitError: class QuoteRateLimitError extends Error {},
  countRecentQuotesByIp: mocks.count,
  departmentName: mocks.departmentName,
  resolveQuoteItems: mocks.resolve,
  saveQuoteRequest: mocks.save,
}));
vi.mock("@/server/data/content", () => ({ getSiteSettings: mocks.settings }));
vi.mock("@/server/erp/send-quote", () => ({ sendQuoteToErp: mocks.sendToErp }));
vi.mock("@/server/mail/send-quote-emails", () => ({ sendQuoteEmails: mocks.sendEmails }));
vi.mock("@/server/log", () => ({
  log: { warn: vi.fn(), info: vi.fn() },
  logError: () => "ABCD1234",
}));

const { submitQuote } = await import("./actions");
const { QUOTE_GUARD } = await import("./guard");

const contact = {
  customerType: "libreria",
  organization: "Librería El Estudiante",
  name: "Ana López",
  phone: "5555 1234",
  email: "",
  department: "quetzaltenango",
};
const lines = [{ type: "variante", ref: "PT00058", packaging: "cajilla12", quantity: 20 }];
const meta = { website: "", elapsedMs: 12_000 };
const item = {
  sku: "PT00058",
  packagingCode: "cajilla12",
  description: "Bolik Ultra Azul PT00058 · Cajilla de 12",
  quantity: 20,
  unitLabel: "cajillas de 12",
};

beforeEach(() => {
  mocks.count.mockResolvedValue(0);
  mocks.departmentName.mockResolvedValue("Quetzaltenango");
  mocks.resolve.mockResolvedValue({ ok: true, items: [item] });
  mocks.save.mockResolvedValue({ id: 7, folio: "COT-2026-000007", persisted: true });
  mocks.settings.mockResolvedValue({ erpEnabled: true });
});
afterEach(() => vi.clearAllMocks());

/** Corre lo que la acción dejó para después de responder. */
const runAfter = async () => {
  for (const [task] of mocks.after.mock.calls) await task();
};

describe("submitQuote (BD-073)", () => {
  it("guarda con el folio, responde de inmediato y deja SAP para después", async () => {
    expect(await submitQuote(contact, lines, meta)).toEqual({
      ok: true,
      data: { folio: "COT-2026-000007" },
    });
    expect(mocks.save).toHaveBeenCalledWith(
      {
        contact: expect.objectContaining({
          phone: "55551234",
          organization: "Librería El Estudiante",
        }),
        items: [item],
        ipHash: "a".repeat(64),
      },
      { max: QUOTE_GUARD.maxPerWindow, windowMs: QUOTE_GUARD.windowMs },
    );
    // SAP no corrió todavía: va en after().
    expect(mocks.sendToErp).not.toHaveBeenCalled();
    await runAfter();
    expect(mocks.sendToErp).toHaveBeenCalledWith(7);
  });

  it("con el ERP apagado en los ajustes, no lo manda y queda omitida (la tarea no la reintenta)", async () => {
    mocks.settings.mockResolvedValue({ erpEnabled: false });
    await submitQuote(contact, lines, meta);
    await runAfter();
    expect(mocks.sendToErp).not.toHaveBeenCalled();
    expect(mocks.saveErpOutcome).toHaveBeenCalledWith(7, { erpStatus: "omitida" });
  });

  it("sin base (fixtures): solo los correos, nada para SAP", async () => {
    mocks.save.mockResolvedValue({ id: 1, folio: "COT-2026-000001", persisted: false });
    expect(await submitQuote(contact, lines, meta)).toMatchObject({ ok: true });
    expect(mocks.after).toHaveBeenCalledTimes(1);
    await runAfter();
    expect(mocks.sendEmails).toHaveBeenCalledWith(expect.objectContaining({ quoteId: 1 }), false);
    expect(mocks.sendToErp).not.toHaveBeenCalled();
  });

  it("los correos (BD-074) van después de responder, con los datos del cliente y las líneas", async () => {
    await submitQuote(contact, lines, meta);
    expect(mocks.sendEmails).not.toHaveBeenCalled();
    await runAfter();
    expect(mocks.sendEmails).toHaveBeenCalledWith(
      expect.objectContaining({
        quoteId: 7,
        folio: "COT-2026-000007",
        customerType: "libreria",
        name: "Ana López",
        phone: "55551234",
        departmentName: "Quetzaltenango",
        items: [item],
      }),
      true,
    );
  });

  it("si la tarea de después falla, se registra y no rompe nada", async () => {
    mocks.settings.mockRejectedValue(new Error("sin base"));
    await submitQuote(contact, lines, meta);
    await expect(runAfter()).resolves.toBeUndefined();
  });

  it("el límite que vale es el de la transacción: si salta ahí, rateLimited", async () => {
    const { QuoteRateLimitError } = await import("@/server/data/quote-requests");
    mocks.save.mockRejectedValue(new QuoteRateLimitError());
    expect(await submitQuote(contact, lines, meta)).toEqual({ ok: false, error: "rateLimited" });
  });

  it("productos que ya no se pueden cotizar: staleItems con sus referencias", async () => {
    mocks.resolve.mockResolvedValue({ ok: false, stale: ["PT00058"] });
    expect(await submitQuote(contact, lines, meta)).toEqual({
      ok: false,
      error: "staleItems",
      stale: ["PT00058"],
    });
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it("campo trampa lleno: no guarda y responde que no se pudo (sin fingir éxito)", async () => {
    expect(await submitQuote(contact, lines, { ...meta, website: "http://spam" })).toEqual({
      ok: false,
      error: "unavailable",
    });
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it("antes del tiempo mínimo o sin medirlo: tooFast, sin guardar", async () => {
    for (const elapsedMs of [QUOTE_GUARD.minFillMs - 1, undefined, "9999", Number.NaN])
      expect(await submitQuote(contact, lines, { ...meta, elapsedMs })).toEqual({
        ok: false,
        error: "tooFast",
      });
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it("5 envíos de la misma IP en 10 minutos: rateLimited", async () => {
    mocks.count.mockResolvedValue(QUOTE_GUARD.maxPerWindow);
    expect(await submitQuote(contact, lines, meta)).toEqual({ ok: false, error: "rateLimited" });
    const since = mocks.count.mock.calls[0]![1] as Date;
    expect(Date.now() - since.getTime()).toBeCloseTo(QUOTE_GUARD.windowMs, -3);
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it("datos inválidos: el error de cada campo, sin tocar la base", async () => {
    expect(await submitQuote({ ...contact, name: "", phone: "" }, lines, meta)).toEqual({
      ok: false,
      error: "invalid",
      fields: {
        name: feedback.forms.errors.required,
        phone: feedback.forms.errors.phoneOrEmail,
        email: feedback.forms.errors.phoneOrEmail,
      },
    });
    expect(await submitQuote(null, lines, meta)).toMatchObject({ ok: false, error: "invalid" });
    expect(await submitQuote(contact, [], meta)).toEqual({ ok: false, error: "invalid" });
    expect(mocks.count).not.toHaveBeenCalled();
  });

  it("departamento que no existe o líneas repetidas: invalid", async () => {
    mocks.departmentName.mockResolvedValueOnce(null);
    expect(await submitQuote(contact, lines, meta)).toEqual({
      ok: false,
      error: "invalid",
      fields: { department: feedback.forms.errors.required },
    });
    mocks.resolve.mockResolvedValueOnce({ ok: false, stale: [] });
    expect(await submitQuote(contact, lines, meta)).toEqual({ ok: false, error: "invalid" });
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it("si la base falla, responde unavailable con un código de referencia (nunca lanza)", async () => {
    mocks.save.mockRejectedValue(new Error("timeout"));
    expect(await submitQuote(contact, lines, meta)).toEqual({
      ok: false,
      error: "unavailable",
      reference: "ABCD1234",
    });
  });
});
