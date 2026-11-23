// @vitest-environment node
import { delay, http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { noopGateway } from "./noop";
import { createSmartK66Gateway } from "./smartk66";
import type { ErpLead } from "./types";

// SMART-K66 simulado con MSW (BD-035): la API real llega con BD-128.
const BASE = "http://smartk66.test/k66api";
const server = setupServer();
beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const sleep = vi.fn(async (_ms: number) => {});
const gateway = (options: Partial<Parameters<typeof createSmartK66Gateway>[0]> = {}) =>
  createSmartK66Gateway({ baseUrl: `${BASE}/`, apiKey: "clave-de-prueba", sleep, ...options });

const lead: ErpLead = {
  folio: "COT-2027-000123",
  customerType: "libreria",
  organization: "Librería El Estudiante",
  contactName: "Ana López",
  phone: "5555-0000",
  email: "ana@ejemplo.com",
  department: "Quetzaltenango",
  notes: "Preventa escolar",
  lines: [
    {
      itemCode: "PT00058",
      packaging: "cajilla12",
      quantity: 20,
      description: "Bolik Ultra Azul · Cajilla de 12",
    },
  ],
};

const PROSPECTOS = `${BASE}/api/web/prospectos`;

describe("SMART-K66: crear prospecto (BD-035)", () => {
  it("manda el contrato del doc 05 §8 con su clave y la del folio, y devuelve la referencia", async () => {
    let received: { headers: Headers; body: unknown } | undefined;
    server.use(
      http.post(PROSPECTOS, async ({ request }) => {
        received = { headers: request.headers, body: await request.json() };
        return HttpResponse.json({ referencia: "OPP-45812" }, { status: 201 });
      }),
    );
    expect(await gateway().createLead(lead)).toEqual({ status: "sent", reference: "OPP-45812" });
    expect(received!.headers.get("authorization")).toBe("ApiKey clave-de-prueba");
    expect(received!.headers.get("idempotency-key")).toBe("COT-2027-000123");
    expect(received!.body).toEqual({
      folio: "COT-2027-000123",
      tipoCliente: "libreria",
      organizacion: "Librería El Estudiante",
      contacto: "Ana López",
      telefono: "5555-0000",
      correo: "ana@ejemplo.com",
      departamento: "Quetzaltenango",
      lineas: [
        {
          itemCode: "PT00058",
          presentacion: "cajilla12",
          cantidad: 20,
          descripcion: "Bolik Ultra Azul · Cajilla de 12",
        },
      ],
      notas: "Preventa escolar",
    });
  });

  it("un fallo pasajero se reintenta y se recupera", async () => {
    let calls = 0;
    server.use(
      http.post(PROSPECTOS, () =>
        ++calls === 1
          ? new HttpResponse(null, { status: 503 })
          : HttpResponse.json({ referencia: "OPP-1" }, { status: 201 }),
      ),
    );
    expect(await gateway().createLead(lead)).toEqual({ status: "sent", reference: "OPP-1" });
    expect(calls).toBe(2);
  });

  it("con la API caída: 1 intento + 3 reintentos con espera creciente, y queda para después", async () => {
    let calls = 0;
    sleep.mockClear();
    server.use(
      http.post(PROSPECTOS, () => {
        calls += 1;
        return new HttpResponse(null, { status: 500 });
      }),
    );
    const result = await gateway({ backoffMs: 100 }).createLead(lead);
    expect(result).toEqual({
      status: "failed",
      failure: {
        kind: "unavailable",
        message: "SMART-K66 respondió 500",
        status: 500,
        retryable: true,
      },
    });
    expect(calls).toBe(4);
    const waits = sleep.mock.calls.map(([ms]) => ms as number);
    expect(waits).toHaveLength(3);
    expect(waits[0]).toBeGreaterThanOrEqual(100);
    expect(waits[1]).toBeGreaterThanOrEqual(200);
    expect(waits[2]).toBeGreaterThanOrEqual(400);
  });

  it("sin red: también es pasajero", async () => {
    server.use(http.post(PROSPECTOS, () => HttpResponse.error()));
    const result = await gateway({ retries: 0 }).createLead(lead);
    expect(result).toMatchObject({
      status: "failed",
      failure: { kind: "unavailable", retryable: true },
    });
  });

  it("si no responde a tiempo, corta y lo dice", async () => {
    server.use(
      http.post(PROSPECTOS, async () => {
        await delay(500);
        return HttpResponse.json({ referencia: "tarde" }, { status: 201 });
      }),
    );
    const result = await gateway({ timeoutMs: 50, retries: 0 }).createLead(lead);
    expect(result).toMatchObject({
      status: "failed",
      failure: {
        kind: "unavailable",
        retryable: true,
        message: expect.stringContaining("no respondió"),
      },
    });
  });

  it("un 4xx no se reintenta: los datos o la clave están mal", async () => {
    let calls = 0;
    server.use(
      http.post(PROSPECTOS, () => {
        calls += 1;
        return HttpResponse.json({ error: "itemCode inválido" }, { status: 422 });
      }),
    );
    expect(await gateway().createLead(lead)).toEqual({
      status: "failed",
      failure: {
        kind: "rejected",
        message: "SMART-K66 rechazó la petición (422)",
        status: 422,
        retryable: false,
      },
    });
    expect(calls).toBe(1);
  });

  it("una respuesta fuera del contrato es un error claro, no un dato basura", async () => {
    server.use(http.post(PROSPECTOS, () => HttpResponse.json({ ok: true }, { status: 201 })));
    expect(await gateway().createLead(lead)).toMatchObject({
      status: "failed",
      failure: { kind: "invalid-response", retryable: false },
    });
    server.use(http.post(PROSPECTOS, () => new HttpResponse("<html>", { status: 200 })));
    expect(await gateway().createLead(lead)).toMatchObject({
      status: "failed",
      failure: { kind: "invalid-response" },
    });
  });

  it("el mensaje del fallo no lleva datos personales", async () => {
    server.use(http.post(PROSPECTOS, () => new HttpResponse(null, { status: 500 })));
    const result = await gateway({ retries: 0 }).createLead(lead);
    expect(JSON.stringify(result)).not.toMatch(/Ana|ana@|5555|Estudiante/);
  });
});

describe("SMART-K66: revisión (BD-035)", () => {
  it("cada reintento manda la misma clave de idempotencia y el mismo cuerpo", async () => {
    const seen: { key: string | null; body: string }[] = [];
    server.use(
      http.post(PROSPECTOS, async ({ request }) => {
        seen.push({ key: request.headers.get("idempotency-key"), body: await request.text() });
        return seen.length < 3
          ? new HttpResponse(null, { status: 502 })
          : HttpResponse.json({ referencia: "OPP-3" }, { status: 201 });
      }),
    );
    await gateway().createLead(lead);
    expect(seen).toHaveLength(3);
    expect(new Set(seen.map((s) => s.key))).toEqual(new Set([lead.folio]));
    expect(new Set(seen.map((s) => s.body)).size).toBe(1);
  });

  it("429 y 409 (la misma clave en curso) son pasajeros", async () => {
    for (const status of [429, 409, 408]) {
      server.use(http.post(PROSPECTOS, () => new HttpResponse(null, { status })));
      expect(await gateway({ retries: 0 }).createLead(lead)).toMatchObject({
        status: "failed",
        failure: { kind: "unavailable", retryable: true, status },
      });
    }
  });

  it("401/403: la clave venció; no se reintenta y se distingue de un rechazo", async () => {
    let calls = 0;
    server.use(
      http.post(PROSPECTOS, () => {
        calls += 1;
        return new HttpResponse(null, { status: 401 });
      }),
    );
    expect(await gateway().createLead(lead)).toMatchObject({
      status: "failed",
      failure: { kind: "unauthorized", retryable: false, status: 401 },
    });
    expect(calls).toBe(1);
  });

  it("si la conexión se corta a media respuesta, es pasajero (no «fuera del contrato»)", async () => {
    server.use(
      http.post(
        PROSPECTOS,
        () =>
          new HttpResponse(
            new ReadableStream({
              start(controller) {
                controller.enqueue(new TextEncoder().encode('{"referencia":'));
                controller.error(new Error("corte"));
              },
            }),
            { status: 201, headers: { "Content-Type": "application/json" } },
          ),
      ),
    );
    expect(await gateway({ retries: 0 }).createLead(lead)).toMatchObject({
      status: "failed",
      failure: { kind: "unavailable", retryable: true },
    });
  });

  it("el azar del backoff no pasa de un cuarto de la espera", async () => {
    sleep.mockClear();
    server.use(http.post(PROSPECTOS, () => new HttpResponse(null, { status: 500 })));
    await gateway({ backoffMs: 100, retries: 1 }).createLead(lead);
    const [wait] = sleep.mock.calls.map(([ms]) => ms);
    expect(wait).toBeGreaterThanOrEqual(100);
    expect(wait).toBeLessThan(125);
  });

  it("la clave de la API nunca aparece en el resultado", async () => {
    server.use(http.post(PROSPECTOS, () => new HttpResponse(null, { status: 401 })));
    const result = await gateway().createLead(lead);
    expect(JSON.stringify(result)).not.toContain("clave-de-prueba");
  });
});

describe("SMART-K66: artículos (BD-036)", () => {
  it("lee y valida los artículos desde una fecha", async () => {
    let url: URL | undefined;
    server.use(
      http.get(`${BASE}/api/web/articulos`, ({ request }) => {
        url = new URL(request.url);
        return HttpResponse.json([
          {
            itemCode: "PT00058",
            itemName: "BOLIGRAFO BOLIK ULTRA AZUL CAJILLA 12",
            barcode: "759364663092",
            active: true,
            salesUnit: "CAJILLA",
            unitsPerSalesUnit: 12,
            updatedAt: "2026-10-20T15:02:11Z",
          },
          {
            itemCode: "PT00059",
            itemName: "NEGRO",
            active: false,
            updatedAt: "2026-10-21T00:00:00Z",
          },
        ]);
      }),
    );
    const result = await gateway().listArticles(new Date("2026-10-01T00:00:00Z"));
    expect(url!.searchParams.get("marca")).toBe("BOLIK");
    expect(url!.searchParams.get("desde")).toBe("2026-10-01T00:00:00.000Z");
    expect(result).toMatchObject({ status: "ok" });
    if (result.status !== "ok") return;
    expect(result.articles[1]).toEqual({
      itemCode: "PT00059",
      itemName: "NEGRO",
      barcode: null,
      active: false,
      salesUnit: null,
      unitsPerSalesUnit: null,
      updatedAt: "2026-10-21T00:00:00Z",
    });
  });

  it("pide la marca indicada (las del grupo, BD-038)", async () => {
    let url: URL | undefined;
    server.use(
      http.get(`${BASE}/api/web/articulos`, ({ request }) => {
        url = new URL(request.url);
        return HttpResponse.json([]);
      }),
    );
    expect(await gateway().listArticles(undefined, "FABIK")).toEqual({
      status: "ok",
      articles: [],
    });
    expect(url!.searchParams.get("marca")).toBe("FABIK");
    expect(url!.searchParams.has("desde")).toBe(false);
  });

  it("un artículo inválido hace fallar la lectura completa", async () => {
    server.use(
      http.get(`${BASE}/api/web/articulos`, () => HttpResponse.json([{ itemCode: "PT1" }])),
    );
    expect(await gateway().listArticles()).toMatchObject({
      status: "failed",
      failure: { kind: "invalid-response" },
    });
  });
});

describe("ERP apagado (noop)", () => {
  it("no llama a nada y lo dice", async () => {
    expect(noopGateway.mode).toBe("noop");
    expect(await noopGateway.createLead(lead)).toEqual({ status: "skipped" });
    expect(await noopGateway.listArticles()).toEqual({ status: "skipped" });
  });
});
