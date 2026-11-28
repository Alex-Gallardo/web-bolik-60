// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/env", () => ({ env: { SESSION_SECRET: "x".repeat(32) } }));
const logError = vi.fn();
vi.mock("@/server/log", () => ({
  log: { warn: vi.fn(), error: (...args: unknown[]) => logError(...args) },
}));

const record = vi.fn<(click: unknown) => Promise<boolean>>(async () => true);
vi.mock("@/server/data/outbound-clicks", () => ({
  recordOutboundClick: (click: unknown) => record(click),
}));

const { POST } = await import("./route");

let ip = 0;
/** Cada prueba con su IP: el límite (60 por minuto) es por IP y vive en el módulo. */
const nextIp = () => `10.1.0.${++ip}`;

const post = (body: BodyInit | null, headers: Record<string, string> = {}) =>
  POST(
    new Request("http://127.0.0.1:3000/api/beacon", {
      method: "POST",
      body,
      headers: { "x-forwarded-for": nextIp(), ...headers },
      // Un ReadableStream como cuerpo (sin Content-Length) lo pide en Node.
      ...(body instanceof ReadableStream ? { duplex: "half" } : {}),
    } as RequestInit),
  );

const walmart = JSON.stringify({ e: "retailer_click", p: "/donde-comprar", r: "walmart" });

beforeEach(() => {
  record.mockReset();
  record.mockResolvedValue(true);
});

describe("POST /api/beacon (BD-083)", () => {
  it("un clic a Walmart se guarda como retailer y responde 204", async () => {
    const response = await post(walmart, {
      "sec-fetch-site": "same-origin",
      "sec-ch-ua-mobile": "?1",
    });
    expect(response.status).toBe(204);
    expect(record).toHaveBeenCalledWith({
      kind: "retailer",
      target: "walmart",
      storeSlug: "walmart",
      departmentSlug: null,
      sku: null,
      path: "/donde-comprar",
      deviceType: "mobile",
    });
  });

  it("rechaza un cuerpo de más de 2 KB con 413, diga o no su tamaño", async () => {
    const big = JSON.stringify({ e: "retailer_click", p: `/${"a".repeat(2_100)}` });
    expect((await post(big)).status).toBe(413);
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(big));
        controller.close();
      },
    });
    expect((await post(stream)).status).toBe(413);
    expect(record).not.toHaveBeenCalled();
    // Justo en el tope, sí se lee (y aquí no es válido: 204 sin guardar).
    expect((await post("x".repeat(2_048))).status).toBe(204);
  });

  it("de otro sitio, sin cuerpo, JSON roto o inválido: 204 sin guardar", async () => {
    expect((await post(walmart, { "sec-fetch-site": "cross-site" })).status).toBe(204);
    expect((await post(null)).status).toBe(204);
    expect((await post("{no es json")).status).toBe(204);
    expect((await post(JSON.stringify({ e: "maps_click", p: "/", nombre: "Ana" }))).status).toBe(
      204,
    );
    expect(record).not.toHaveBeenCalled();
  });

  it("más de 60 por minuto desde una IP: no se guardan", async () => {
    const send = () =>
      POST(
        new Request("http://127.0.0.1:3000/api/beacon", {
          method: "POST",
          body: walmart,
          headers: { "x-forwarded-for": "10.9.9.9" },
        }),
      );
    for (let i = 0; i < 61; i++) expect((await send()).status).toBe(204);
    expect(record).toHaveBeenCalledTimes(60);
  });

  it("sin la IP del visitante (sin X-Forwarded-For) no aplica el límite", async () => {
    const send = () =>
      POST(new Request("http://127.0.0.1:3000/api/beacon", { method: "POST", body: walmart }));
    for (let i = 0; i < 61; i++) await send();
    expect(record).toHaveBeenCalledTimes(61);
  });

  it("guarda la ruta sin el folio de la cotización", async () => {
    await post(
      JSON.stringify({ e: "whatsapp_open", p: "/cotizacion/enviada/COT-2027-000001", c: "quote" }),
    );
    expect(record).toHaveBeenCalledWith(expect.objectContaining({ path: "/cotizacion/enviada" }));
  });

  it("si la base falla, igual responde 204", async () => {
    record.mockRejectedValue(new Error("sin base"));
    expect((await post(walmart)).status).toBe(204);
    expect(logError).toHaveBeenCalled();
  });
});
