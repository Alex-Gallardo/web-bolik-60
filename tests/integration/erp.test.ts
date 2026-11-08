import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { parseSeedData } from "../../prisma/seed/data";
import { seedDatabase } from "../../prisma/seed/seed";
import { saveErpOutcome } from "@/server/data/quote-erp";
import { noopGateway } from "@/server/erp/noop";
import { sendQuoteToErp } from "@/server/erp/send-quote";
import { createSmartK66Gateway } from "@/server/erp/smartk66";
import { db } from "@/server/db";

// Envío de cotizaciones al ERP (BD-035) contra BolikDigital_Test, con SMART-K66 simulado (MSW).
// Criterio: con la API caída, la cotización queda guardada con erpStatus = pendiente.
// Las escrituras solo corren con DATA_SOURCE=db: se fuerza aquí (la suite usa la base de pruebas).
vi.mock("@/env", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/env")>();
  return { env: { ...original.env, DATA_SOURCE: "db" } };
});

const FOLIO = "COT-IT-035";
const BASE = "http://smartk66.test";
const server = setupServer();

const gateway = createSmartK66Gateway({
  baseUrl: BASE,
  apiKey: "clave-de-prueba",
  sleep: async () => {},
});

async function cleanup() {
  await db.quoteRequest.deleteMany({ where: { folio: { startsWith: FOLIO } } });
}

async function createQuote(suffix: string, customerType = "libreria") {
  const variant = await db.productVariant.findUniqueOrThrow({ where: { sku: "PT00058" } });
  const department = await db.department.findUniqueOrThrow({ where: { slug: "quetzaltenango" } });
  const quote = await db.quoteRequest.create({
    data: {
      folio: `${FOLIO}-${suffix}`,
      customerType,
      organization: "Librería de prueba",
      contactName: "Contacto de prueba",
      phone: "5555-0000",
      departmentId: department.id,
      items: {
        create: [
          {
            itemType: "variante",
            variantId: variant.id,
            packagingCode: "cajilla12",
            description: "Bolik Ultra Azul · Cajilla de 12",
            quantity: 20,
            unitLabel: "cajillas",
          },
          {
            itemType: "personalizado",
            description: "Lapiceros con logo",
            quantity: 500,
            unitLabel: "unidades",
            sortOrder: 1,
          },
        ],
      },
    },
  });
  return quote.id;
}

beforeAll(async () => {
  server.listen({ onUnhandledFrame: "error" });
  // El Bolik Ultra y los departamentos vienen del seed (BD-031).
  await seedDatabase(db, parseSeedData(), { profile: "dev" });
}, 180_000);
beforeEach(async () => {
  server.resetHandlers();
  await cleanup();
});
afterAll(async () => {
  server.close();
  await cleanup();
  await db.$disconnect();
});

describe("sendQuoteToErp (BD-035)", () => {
  it("con la API caída la cotización queda pendiente, con el intento y el motivo", async () => {
    server.use(
      http.post(`${BASE}/api/web/prospectos`, () => new HttpResponse(null, { status: 503 })),
    );
    const id = await createQuote("c");
    expect(await sendQuoteToErp(id, gateway)).toEqual({
      erpStatus: "pendiente",
      message: "SMART-K66 respondió 503",
    });
    const quote = await db.quoteRequest.findUniqueOrThrow({ where: { id } });
    expect(quote).toMatchObject({
      erpStatus: "pendiente",
      erpAttempts: 1,
      erpLastError: "SMART-K66 respondió 503",
      erpRef: null,
      erpSentAt: null,
    });
  });

  it("enviada: guarda la referencia y no la vuelve a mandar", async () => {
    let body: { folio?: string; departamento?: string; lineas?: unknown[] } = {};
    let calls = 0;
    server.use(
      http.post(`${BASE}/api/web/prospectos`, async ({ request }) => {
        calls += 1;
        body = (await request.json()) as typeof body;
        return HttpResponse.json({ referencia: "OPP-45812" }, { status: 201 });
      }),
    );
    const id = await createQuote("ok");
    expect(await sendQuoteToErp(id, gateway)).toEqual({
      erpStatus: "enviada",
      reference: "OPP-45812",
    });
    expect(body).toMatchObject({
      folio: `${FOLIO}-ok`,
      departamento: "Quetzaltenango",
      lineas: [
        { itemCode: "PT00058", presentacion: "cajilla12", cantidad: 20 },
        { itemCode: null, presentacion: null, cantidad: 500, descripcion: "Lapiceros con logo" },
      ],
    });
    const quote = await db.quoteRequest.findUniqueOrThrow({ where: { id } });
    expect(quote).toMatchObject({ erpStatus: "enviada", erpRef: "OPP-45812", erpAttempts: 1 });
    expect(quote.erpSentAt).not.toBeNull();

    expect(await sendQuoteToErp(id, gateway)).toBeNull();
    expect(calls).toBe(1);
  });

  it("un pendiente que se reintenta y entra queda enviado y sin error", async () => {
    const id = await createQuote("r");
    server.use(http.post(`${BASE}/api/web/prospectos`, () => HttpResponse.error()));
    await sendQuoteToErp(id, gateway);
    server.use(
      http.post(`${BASE}/api/web/prospectos`, () =>
        HttpResponse.json({ referencia: "OPP-2" }, { status: 201 }),
      ),
    );
    await sendQuoteToErp(id, gateway);
    const quote = await db.quoteRequest.findUniqueOrThrow({ where: { id } });
    expect(quote).toMatchObject({
      erpStatus: "enviada",
      erpRef: "OPP-2",
      erpAttempts: 2,
      erpLastError: null,
    });
  });

  it("rechazada (4xx) queda en error para que la revise una persona", async () => {
    server.use(
      http.post(`${BASE}/api/web/prospectos`, () => HttpResponse.json({}, { status: 400 })),
    );
    const id = await createQuote("x");
    expect(await sendQuoteToErp(id, gateway)).toMatchObject({ erpStatus: "error" });
    expect(await db.quoteRequest.findUniqueOrThrow({ where: { id } })).toMatchObject({
      erpStatus: "error",
      erpAttempts: 1,
    });
  });

  it("con ERP_MODE=noop queda omitida, sin intentos", async () => {
    const id = await createQuote("n");
    expect(await sendQuoteToErp(id, noopGateway)).toEqual({ erpStatus: "omitida" });
    expect(await db.quoteRequest.findUniqueOrThrow({ where: { id } })).toMatchObject({
      erpStatus: "omitida",
      erpAttempts: 0,
    });
  });

  it("una cotización que no existe no lanza", async () => {
    expect(await sendQuoteToErp(-1, gateway)).toBeNull();
  });

  it("una vez enviada, un resultado tardío no la baja de estado", async () => {
    const id = await createQuote("t");
    await saveErpOutcome(id, { erpStatus: "enviada", reference: "OPP-9" });
    await saveErpOutcome(id, { erpStatus: "pendiente", message: "tarde" });
    await saveErpOutcome(id, { erpStatus: "omitida" });
    expect(await db.quoteRequest.findUniqueOrThrow({ where: { id } })).toMatchObject({
      erpStatus: "enviada",
      erpRef: "OPP-9",
      erpLastError: null,
    });
  });

  it("dos procesos a la vez: solo uno la manda", async () => {
    let calls = 0;
    server.use(
      http.post(`${BASE}/api/web/prospectos`, async () => {
        calls += 1;
        await new Promise((resolve) => setTimeout(resolve, 200));
        return HttpResponse.json({ referencia: "OPP-UNA" }, { status: 201 });
      }),
    );
    const id = await createQuote("d");
    const results = await Promise.all([sendQuoteToErp(id, gateway), sendQuoteToErp(id, gateway)]);
    expect(calls).toBe(1);
    expect(results.filter(Boolean)).toHaveLength(1);
    expect(await db.quoteRequest.findUniqueOrThrow({ where: { id } })).toMatchObject({
      erpStatus: "enviada",
      erpAttempts: 1,
    });
  });

  it("una respuesta fuera del contrato queda en error", async () => {
    server.use(
      http.post(`${BASE}/api/web/prospectos`, () => HttpResponse.json({}, { status: 201 })),
    );
    const id = await createQuote("i");
    expect(await sendQuoteToErp(id, gateway)).toMatchObject({ erpStatus: "error" });
  });

  it("un tipo de cliente fuera de la lista viaja como «otro»", async () => {
    let tipo: unknown;
    server.use(
      http.post(`${BASE}/api/web/prospectos`, async ({ request }) => {
        tipo = ((await request.json()) as { tipoCliente?: unknown }).tipoCliente;
        return HttpResponse.json({ referencia: "OPP-O" }, { status: 201 });
      }),
    );
    const id = await createQuote("o", "mayorista");
    await sendQuoteToErp(id, gateway);
    expect(tipo).toBe("otro");
  });
});
