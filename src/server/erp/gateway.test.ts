// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

// La selección por ERP_MODE (BD-035): cada caso carga el módulo con su propio entorno.
afterEach(() => {
  vi.resetModules();
  vi.doUnmock("@/env");
});

async function gatewayWith(env: Record<string, string | undefined>) {
  vi.doMock("@/env", () => ({ env }));
  vi.doMock("@/server/log", () => ({ log: { warn: vi.fn() } }));
  const { getErpGateway } = await import("./gateway");
  return getErpGateway();
}

describe("getErpGateway", () => {
  it("noop por defecto", async () => {
    expect((await gatewayWith({ ERP_MODE: "noop" })).mode).toBe("noop");
  });

  it("smartk66 con URL y clave", async () => {
    const gateway = await gatewayWith({
      ERP_MODE: "smartk66",
      ERP_BASE_URL: "http://smartk66.test",
      ERP_API_KEY: "clave",
    });
    expect(gateway.mode).toBe("smartk66");
  });

  it("sin URL o clave nunca intenta llamar: queda en noop", async () => {
    expect((await gatewayWith({ ERP_MODE: "smartk66" })).mode).toBe("noop");
  });

  it("se crea una vez por proceso", async () => {
    vi.doMock("@/env", () => ({ env: { ERP_MODE: "noop" } }));
    const { getErpGateway } = await import("./gateway");
    expect(getErpGateway()).toBe(getErpGateway());
  });
});
