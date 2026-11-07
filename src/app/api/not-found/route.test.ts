// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NOT_FOUND_BEACON } from "../../not-found-beacon";
import { POST } from "./route";

const record = vi.fn();
vi.mock("@/server/seo/not-found-log", () => ({
  notFoundHits: { record: (...args: unknown[]) => record(...args) },
}));

const post = (body: string, headers: Record<string, string> = {}) =>
  POST(new Request("http://127.0.0.1:3000/api/not-found", { method: "POST", body, headers }));

beforeEach(() => record.mockReset());

describe("POST /api/not-found (BD-046)", () => {
  it("cuenta la ruta normalizada con su referer", async () => {
    const response = await post(JSON.stringify({ p: "/Viejo/?b=2&a=1", r: "https://google.com/" }));
    expect(response.status).toBe(204);
    expect(record).toHaveBeenCalledWith("/viejo?a=1&b=2", "https://google.com/");
  });

  it("sin referer guarda null", async () => {
    await post(JSON.stringify({ p: "/viejo", r: "" }));
    expect(record).toHaveBeenCalledWith("/viejo", null);
  });

  it("ignora lo que no es una ruta, sin decirle nada a quien llama", async () => {
    for (const body of ["nada", "{}", JSON.stringify({ p: "https://otro.com" })]) {
      expect((await post(body)).status).toBe(204);
    }
    expect(record).not.toHaveBeenCalled();
  });

  it("el script de la 404 avisa a esta ruta", () => {
    expect(NOT_FOUND_BEACON).toContain('sendBeacon("/api/not-found"');
  });

  it("del mismo sitio cuenta; de otro sitio, no", async () => {
    const body = JSON.stringify({ p: "/viejo" });
    await post(body, { "sec-fetch-site": "same-origin" });
    await post(body, { "sec-fetch-site": "cross-site" });
    await post(body, { "sec-fetch-site": "same-site" });
    expect(record).toHaveBeenCalledOnce();
  });

  it("ignora un cuerpo de más de 4 KB", async () => {
    const response = await post(JSON.stringify({ p: `/${"x".repeat(5_000)}` }));
    expect(response.status).toBe(204);
    expect(record).not.toHaveBeenCalled();
  });

  it("del referer guarda solo origen y ruta http(s)", async () => {
    await post(JSON.stringify({ p: "/a", r: "https://www.google.com/search?q=mi+correo" }));
    await post(JSON.stringify({ p: "/b", r: "javascript:alert(1)" }));
    expect(record.mock.calls).toEqual([
      ["/a", "https://www.google.com/search"],
      ["/b", null],
    ]);
  });

  it("no guarda parámetros de seguimiento en la ruta", async () => {
    await post(JSON.stringify({ p: "/viejo?fbclid=abc&utm_source=fb" }));
    expect(record).toHaveBeenCalledWith("/viejo", null);
  });
});
