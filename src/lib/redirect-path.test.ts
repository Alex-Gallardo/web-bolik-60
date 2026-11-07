// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  buildRedirectMap,
  isInternalPath,
  normalizeRedirectPath,
  normalizeStoredPath,
  withoutQuery,
} from "./redirect-path";

describe("normalizeRedirectPath", () => {
  it("minúsculas, sin barra final y con la query ordenada", () => {
    expect(normalizeRedirectPath("/Index.php/Productos/", "?b=2&a=1")).toBe(
      "/index.php/productos?a=1&b=2",
    );
    expect(normalizeRedirectPath("/")).toBe("/");
    expect(normalizeRedirectPath("//", "")).toBe("/");
  });

  it("ignora el parámetro interno de navegación de Next", () => {
    expect(normalizeRedirectPath("/viejo", "?_rsc=abc")).toBe("/viejo");
    expect(normalizeRedirectPath("/viejo", "?_rsc=abc&id=17")).toBe("/viejo?id=17");
  });

  it("una ruta guardada da lo mismo que la de la petición", () => {
    expect(normalizeStoredPath(" /index.php?option=com_virtuemart&view=productdetails ")).toBe(
      normalizeRedirectPath("/index.php", "?view=productdetails&option=com_virtuemart"),
    );
  });
});

describe("isInternalPath", () => {
  it("acepta rutas del propio sitio", () => {
    expect(isInternalPath("/productos/boligrafos/bolik-ultra")).toBe(true);
    expect(isInternalPath("/buscar?q=ultra")).toBe(true);
  });

  it("rechaza destinos que llevarían a otro sitio o rutas raras", () => {
    for (const value of [
      "https://otro.com",
      "//otro.com",
      "/\\otro.com",
      "productos",
      "/con espacio",
      `/${"a".repeat(460)}`,
    ]) {
      expect(isInternalPath(value), value).toBe(false);
    }
  });
});

describe("buildRedirectMap", () => {
  const row = (fromPath: string, toPath: string, statusCode = 301) => ({
    fromPath,
    toPath,
    statusCode,
  });

  it("normaliza la clave y conserva el destino y el estado", () => {
    const { map, skipped } = buildRedirectMap([
      row("/Index.php/Contactenos/", "/contacto"),
      row("/viejo", "/nuevo", 308),
    ]);
    expect(map.get("/index.php/contactenos")).toEqual({
      to: "/contacto",
      status: 301,
      fromPath: "/Index.php/Contactenos/",
    });
    expect(map.get("/viejo")).toEqual({ to: "/nuevo", status: 308, fromPath: "/viejo" });
    expect(skipped).toEqual([]);
  });

  it("un estado desconocido cuenta como 301", () => {
    expect(buildRedirectMap([row("/a", "/b", 410)]).map.get("/a")?.status).toBe(301);
  });

  it("resuelve cadenas a un solo salto", () => {
    const { map } = buildRedirectMap([row("/a", "/b"), row("/b", "/c"), row("/c", "/d")]);
    expect(map.get("/a")?.to).toBe("/d");
    expect(map.get("/b")?.to).toBe("/d");
  });

  it("descarta ciclos, destinos externos y redirecciones a sí mismas", () => {
    const { map, skipped } = buildRedirectMap([
      row("/a", "/b"),
      row("/b", "/a"),
      row("/x", "https://otro.com"),
      row("/y", "//otro.com"),
      row("/z", "/Z/"),
      row("/ok", "/destino"),
    ]);
    expect([...map.keys()]).toEqual(["/ok"]);
    expect(skipped.sort()).toEqual(["/a", "/b", "/x", "/y", "/z"].sort());
  });
});

describe("normalización: acentos, seguimiento y duplicados (revisión BD-046)", () => {
  it("una ruta con acentos es la misma escrita o codificada", () => {
    expect(normalizeRedirectPath("/Caf%C3%A9/")).toBe("/caf%C3%A9");
    expect(normalizeStoredPath("/Café")).toBe("/caf%C3%A9");
    expect(normalizeStoredPath("/CAFÉ")).toBe(normalizeRedirectPath("/caf%c3%a9"));
    expect(normalizeRedirectPath("/100%")).toBe("/100%"); // % inválido: se deja
    expect(normalizeRedirectPath("//otro.com")).toBe("//otro.com"); // sigue siendo ruta
  });

  it("quita los parámetros de seguimiento de campañas y redes", () => {
    expect(
      normalizeRedirectPath(
        "/viejo",
        "?utm_source=fb&UTM_Medium=x&fbclid=1&gclid=2&msclkid=3&id=7",
      ),
    ).toBe("/viejo?id=7");
  });

  it("withoutQuery deja solo la ruta", () => {
    expect(withoutQuery("/viejo?ref=algo")).toBe("/viejo");
    expect(withoutQuery("/viejo")).toBe("/viejo");
  });

  it("rechaza caracteres de control en el destino", () => {
    expect(isInternalPath("/a\u0001b")).toBe(false);
  });

  it("dos filas que quedan iguales al normalizar: gana la primera y la otra se avisa", () => {
    const { map, skipped } = buildRedirectMap([
      { fromPath: "/viejo", toPath: "/uno", statusCode: 301 },
      { fromPath: "/Viejo/", toPath: "/dos", statusCode: 301 },
    ]);
    expect(map.get("/viejo")?.to).toBe("/uno");
    expect(skipped).toEqual(["/Viejo/"]);
  });
});
