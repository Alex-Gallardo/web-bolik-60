import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { http, HttpResponse, delay } from "msw";
import { setupServer } from "msw/node";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { parseSeedData } from "../../prisma/seed/data";
import { seedDatabase } from "../../prisma/seed/seed";
import { FOLIO_REGEX } from "@/lib/folio";
import { db } from "@/server/db";
import { createSmartK66Gateway } from "@/server/erp/smartk66";

// submitQuote (BD-073, docs/13 §4) contra BolikDigital_Test, con SMART-K66 simulado (MSW).
// Criterio: respuesta en < 800 ms con el ERP lento (SAP va en after(), después de responder).
// Los correos (BD-074) todavía no existen.
const BASE = "http://smartk66.test";
const server = setupServer();

const state = vi.hoisted(() => ({
  ip: "10.0.0.1",
  afterTasks: [] as (() => Promise<unknown>)[],
}));

// Escrituras con SQL Server; la caché de Next no existe fuera del servidor de Next.
vi.mock("@/env", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/env")>();
  return { env: { ...original.env, DATA_SOURCE: "db" } };
});
vi.mock("next/cache", () => ({ cacheLife: () => {}, cacheTag: () => {} }));
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-forwarded-for": state.ip }),
}));
vi.mock("next/server", () => ({
  after: (task: () => Promise<unknown>) => state.afterTasks.push(task),
}));
vi.mock("@/server/erp/gateway", () => ({
  getErpGateway: () =>
    createSmartK66Gateway({ baseUrl: BASE, apiKey: "clave-de-prueba", sleep: async () => {} }),
}));

// Correos en modo prueba, en una carpeta temporal (no en la bandeja de desarrollo).
const MAIL_TMP = path.join(tmpdir(), `bolik-it-mails-${process.pid}`);
vi.mock("@/server/mail/transport", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/server/mail/transport")>();
  return {
    ...original,
    sendMail: (message: import("@/server/mail/transport").MailMessage) =>
      original.sendMail(message, { mode: "file", dir: MAIL_TMP }),
  };
});

const { submitQuote } = await import("@/features/quote/actions");
const { listStoredMails } = await import("@/server/mail/transport");

const contact = {
  customerType: "libreria",
  organization: "Librería de prueba BD-073",
  name: "Ana López",
  phone: "5555 1234",
  email: "",
  department: "quetzaltenango",
  notes: "Para enero",
};
const lines = [
  { type: "variante", ref: "PT00058", packaging: "cajilla12", quantity: 20 },
  { type: "variante", ref: "PT00059", quantity: 3 },
];
const meta = { website: "", elapsedMs: 10_000 };

/** Cada prueba, desde su propia IP: el límite por IP no se mezcla entre pruebas. */
let ipCounter = 0;
const newIp = () => {
  ipCounter += 1;
  state.ip = `10.73.0.${ipCounter}`;
};

async function cleanup() {
  await db.quoteRequest.deleteMany({
    where: { organization: { startsWith: "Librería de prueba BD-073" } },
  });
}

beforeAll(async () => {
  server.listen({ onUnhandledFrame: "error" });
  await seedDatabase(db, parseSeedData(), { profile: "dev" });
}, 180_000);
beforeEach(async () => {
  server.resetHandlers();
  state.afterTasks = [];
  newIp();
  await cleanup();
});
afterAll(async () => {
  await rm(MAIL_TMP, { recursive: true, force: true });
  server.close();
  await cleanup();
  await db.$disconnect();
});

describe("submitQuote contra SQL Server (BD-073)", () => {
  it("crea QuoteRequest con sus QuoteItem y folio; las líneas las arma el servidor", async () => {
    const result = await submitQuote(contact, lines, meta);
    expect(result).toMatchObject({ ok: true });
    if (!result.ok) return;
    expect(result.data.folio).toMatch(FOLIO_REGEX);

    const quote = await db.quoteRequest.findUniqueOrThrow({
      where: { folio: result.data.folio },
      include: { items: { orderBy: { sortOrder: "asc" } }, department: true },
    });
    expect(quote).toMatchObject({
      customerType: "libreria",
      contactName: "Ana López",
      phone: "55551234",
      email: null,
      notes: "Para enero",
      source: "web",
      status: "nueva",
      erpStatus: "pendiente",
    });
    expect(quote.department?.slug).toBe("quetzaltenango");
    expect(quote.ipHash).toMatch(/^[0-9a-f]{64}$/);
    expect(quote.ipHash).not.toContain("10.73");
    expect(quote.items).toEqual([
      expect.objectContaining({
        itemType: "variante",
        packagingCode: "cajilla12",
        description: expect.stringMatching(/^Bolik Ultra Azul PT00058 · /),
        quantity: 20,
        unitLabel: "cajillas de 12",
        variantId: expect.any(Number),
      }),
      expect.objectContaining({
        packagingCode: null,
        description: expect.stringContaining("PT00059"),
        quantity: 3,
        unitLabel: "unidades",
      }),
    ]);
  });

  it("envía el correo interno y el acuse después de responder (BD-074; modo prueba: emailSentAt vacío)", async () => {
    await rm(MAIL_TMP, { recursive: true, force: true });
    const result = await submitQuote({ ...contact, email: "ana@ejemplo.com" }, lines, meta);
    expect(result).toMatchObject({ ok: true });
    if (!result.ok) return;
    // Antes de la tarea de después no hay correos.
    expect(await listStoredMails(20, MAIL_TMP)).toEqual([]);
    for (const task of state.afterTasks) await task();

    const mails = await listStoredMails(20, MAIL_TMP);
    const sales = mails.find((m) => m.subject.startsWith("Nueva cotización"));
    const ack = mails.find((m) => m.subject.startsWith("Recibimos tu cotización"));
    expect(sales?.subject).toBe(
      `Nueva cotización ${result.data.folio} · Librería o tienda · Quetzaltenango`,
    );
    expect(sales?.html).toContain("/admin/cotizaciones/");
    expect(ack?.to).toBe("ana@ejemplo.com");
    expect(ack?.html).not.toContain("/admin");
    const quote = await db.quoteRequest.findUniqueOrThrow({ where: { folio: result.data.folio } });
    // En modo prueba (SMTP_MODE=file) nada salió de verdad: emailSentAt no se marca. Con SMTP real
    // se marca (send-quote-emails.test.ts).
    expect(quote.emailSentAt).toBeNull();
  });

  it("20 envíos simultáneos no repiten folio y quedan consecutivos", async () => {
    const results = await Promise.all(
      Array.from({ length: 20 }, async (_, i) => {
        state.ip = `10.74.0.${i}`; // cada uno desde su IP: aquí no se prueba el límite
        return submitQuote(contact, lines, meta);
      }),
    );
    const folios = results.map((r) => (r.ok ? r.data.folio : r.error));
    expect(new Set(folios).size).toBe(20);
    const numbers = folios.map((f) => Number(f.slice(-6))).sort((a, b) => a - b);
    expect(numbers.at(-1)! - numbers[0]!).toBe(19);
  }, 60_000);

  it("el sexto envío de la misma IP en 10 minutos se rechaza sin guardar", async () => {
    for (let i = 0; i < 5; i += 1)
      expect(await submitQuote(contact, lines, meta)).toMatchObject({ ok: true });
    expect(await submitQuote(contact, lines, meta)).toEqual({ ok: false, error: "rateLimited" });
    expect(
      await db.quoteRequest.count({
        where: { organization: { startsWith: "Librería de prueba BD-073" } },
      }),
    ).toBe(5);
  });

  it("con SMART-K66 caído, el visitante recibe su folio y la cotización queda pendiente", async () => {
    server.use(
      http.post(`${BASE}/api/web/prospectos`, () => new HttpResponse(null, { status: 503 })),
    );
    const result = await submitQuote(contact, lines, meta);
    expect(result).toMatchObject({ ok: true });
    if (!result.ok) return;
    for (const task of state.afterTasks) await task();
    const quote = await db.quoteRequest.findUniqueOrThrow({ where: { folio: result.data.folio } });
    expect(quote).toMatchObject({ erpStatus: "pendiente", erpAttempts: 1 });
  });

  it("responde en menos de 800 ms aunque SMART-K66 tarde 5 s (criterio de BD-073)", async () => {
    server.use(
      http.post(`${BASE}/api/web/prospectos`, async () => {
        await delay(5_000);
        return HttpResponse.json({ referencia: "LEAD-1" }, { status: 201 });
      }),
    );
    // Calentar la conexión y la caché de la consulta: se mide un envío normal, no el primero.
    await submitQuote(contact, lines, meta);
    newIp();
    const started = performance.now();
    const result = await submitQuote(contact, lines, meta);
    const elapsed = performance.now() - started;
    expect(result).toMatchObject({ ok: true });
    expect(elapsed, "ms hasta responder").toBeLessThan(800);
    // SAP quedó para después de responder: corriendo la tarea, sí llega a SMART-K66 (5 s).
    expect(state.afterTasks.length).toBeGreaterThan(0);
    const last = state.afterTasks.at(-1)!;
    await last();
    const quote = await db.quoteRequest.findUniqueOrThrow({
      where: { folio: result.ok ? result.data.folio : "" },
    });
    expect(quote).toMatchObject({ erpStatus: "enviada", erpRef: "LEAD-1" });
  });

  it("10 envíos simultáneos desde la misma IP: se guardan 5 y el resto recibe rateLimited", async () => {
    const results = await Promise.all(
      Array.from({ length: 10 }, () => submitQuote(contact, lines, meta)),
    );
    expect(results.filter((r) => r.ok)).toHaveLength(5);
    expect(results.filter((r) => !r.ok && r.error === "rateLimited")).toHaveLength(5);
    expect(
      await db.quoteRequest.count({
        where: { organization: { startsWith: "Librería de prueba BD-073" } },
      }),
    ).toBe(5);
  }, 60_000);

  it("con erp_enabled = false queda omitida y no llama a SMART-K66", async () => {
    let calls = 0;
    server.use(
      http.post(`${BASE}/api/web/prospectos`, () => {
        calls += 1;
        return HttpResponse.json({ referencia: "LEAD-2" }, { status: 201 });
      }),
    );
    await db.siteSetting.upsert({
      where: { key: "erp_enabled" },
      create: { key: "erp_enabled", value: "false" },
      update: { value: "false" },
    });
    try {
      const result = await submitQuote(contact, lines, meta);
      for (const task of state.afterTasks) await task();
      const quote = await db.quoteRequest.findUniqueOrThrow({
        where: { folio: result.ok ? result.data.folio : "" },
      });
      expect(quote.erpStatus).toBe("omitida");
      expect(calls).toBe(0);
    } finally {
      await db.siteSetting.deleteMany({ where: { key: "erp_enabled" } });
    }
  });

  it("un SKU que no existe o una presentación que no es del producto: staleItems con la referencia, sin guardar", async () => {
    expect(
      await submitQuote(contact, [{ type: "variante", ref: "NOEXISTE1", quantity: 1 }], meta),
    ).toEqual({ ok: false, error: "staleItems", stale: ["NOEXISTE1"] });
    expect(
      await submitQuote(
        contact,
        [{ type: "variante", ref: "PT00058", packaging: "bote", quantity: 1 }],
        meta,
      ),
    ).toEqual({ ok: false, error: "staleItems", stale: ["PT00058"] });
    expect(
      await db.quoteRequest.count({
        where: { organization: { startsWith: "Librería de prueba BD-073" } },
      }),
    ).toBe(0);
  });
});
