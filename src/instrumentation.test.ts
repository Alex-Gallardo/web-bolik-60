// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

const { error } = vi.hoisted(() => ({ error: vi.fn() }));
vi.mock("./server/log", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./server/log")>()),
  log: { error },
}));

const { onRequestError } = await import("./instrumentation");

type RequestArg = Parameters<typeof onRequestError>[1];
type ContextArg = Parameters<typeof onRequestError>[2];
const request = { path: "/buscar?q=ana@example.com", method: "GET", headers: {} } as RequestArg;
const context = {
  routerKind: "App Router",
  routePath: "/buscar",
  routeType: "render",
} as ContextArg;

afterEach(() => {
  vi.unstubAllEnvs();
  error.mockClear();
});

describe("onRequestError", () => {
  it("registra el error con el digest como requestId y la ruta sin query string", async () => {
    vi.stubEnv("NEXT_RUNTIME", "nodejs");
    const err = Object.assign(new Error("fallo"), { digest: "2696662010" });
    await onRequestError(err, request, context);

    expect(error).toHaveBeenCalledOnce();
    const [fields, message] = error.mock.calls[0]!;
    expect(fields).toMatchObject({
      requestId: "2696662010",
      path: "/buscar",
      method: "GET",
      routePath: "/buscar",
      routeType: "render",
      err,
    });
    expect(message).toBe("error en petición");
  });

  it("pasa al log un digest de 8 dígitos sin cambios", async () => {
    vi.stubEnv("NEXT_RUNTIME", "nodejs");
    await onRequestError(Object.assign(new Error("fallo"), { digest: 12345678 }), request, context);
    expect(error.mock.calls[0]![0]).toMatchObject({ requestId: "12345678" });
  });

  it("no hace nada fuera del runtime de Node", async () => {
    vi.stubEnv("NEXT_RUNTIME", "edge");
    await onRequestError(new Error("x"), request, context);
    expect(error).not.toHaveBeenCalled();
  });
});
