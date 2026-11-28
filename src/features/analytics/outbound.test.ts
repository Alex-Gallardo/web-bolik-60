import { describe, expect, it } from "vitest";
import { beaconSchema, deviceTypeOf, outboundPath, toOutboundClick } from "./outbound";

describe("aviso de un clic saliente (BD-083)", () => {
  it("acepta lo que manda el script", () => {
    expect(
      beaconSchema.parse({ e: "retailer_click", p: "/donde-comprar", r: "walmart", k: "pt00058" }),
    ).toEqual({ e: "retailer_click", p: "/donde-comprar", r: "walmart", k: "pt00058" });
    expect(
      beaconSchema.parse({ e: "maps_click", p: "/", s: "tulan-xela", d: "quetzaltenango" }),
    ).toMatchObject({ s: "tulan-xela" });
  });

  it.each([
    ["un evento que no es saliente", { e: "quote_open", p: "/" }],
    ["una clave de más", { e: "maps_click", p: "/", nombre: "Ana" }],
    ["la ruta con query (puede traer datos)", { e: "maps_click", p: "/buscar?q=ana" }],
    ["una ruta que no es del sitio", { e: "maps_click", p: "https://otro.com/" }],
    ["un slug inválido", { e: "maps_click", p: "/", s: "<script>" }],
    ["un SKU raro", { e: "retailer_click", p: "/", k: "PT 58; drop" }],
    ["un contexto desconocido", { e: "whatsapp_open", p: "/", c: "otro" }],
    ["la ruta con caracteres raros", { e: "maps_click", p: "/<script>" }],
    ["la ruta con espacios", { e: "maps_click", p: "/a b" }],
  ])("rechaza %s", (_name, payload) => {
    expect(beaconSchema.safeParse(payload).success).toBe(false);
  });

  it("tienda en línea: kind retailer, target y tienda con su slug, SKU en mayúsculas", () => {
    expect(
      toOutboundClick(
        { e: "retailer_click", p: "/productos/x/y", r: "walmart", k: "pt00058" },
        "mobile",
      ),
    ).toEqual({
      kind: "retailer",
      target: "walmart",
      storeSlug: "walmart",
      departmentSlug: null,
      sku: "PT00058",
      path: "/productos/x/y",
      deviceType: "mobile",
    });
  });

  it("«Cómo llegar»: kind maps, target google_maps, la tienda y su departamento", () => {
    expect(
      toOutboundClick(
        { e: "maps_click", p: "/donde-comprar", s: "tulan-quetzaltenango", d: "quetzaltenango" },
        "desktop",
      ),
    ).toMatchObject({
      kind: "maps",
      target: "google_maps",
      storeSlug: "tulan-quetzaltenango",
      departmentSlug: "quetzaltenango",
    });
  });

  it("WhatsApp: kind whatsapp con su contexto (general si no viene)", () => {
    expect(
      toOutboundClick({ e: "whatsapp_open", p: "/", c: "product", k: "PT00058" }, "mobile"),
    ).toMatchObject({ kind: "whatsapp", target: "product", storeSlug: null, sku: "PT00058" });
    expect(toOutboundClick({ e: "whatsapp_open", p: "/" }, "mobile").target).toBe("general");
  });

  it("móvil o escritorio: Sec-CH-UA-Mobile y, sin ella, el user agent", () => {
    const of = (headers: Record<string, string>) => deviceTypeOf(new Headers(headers));
    expect(of({ "sec-ch-ua-mobile": "?1" })).toBe("mobile");
    expect(of({ "sec-ch-ua-mobile": "?0", "user-agent": "iPhone" })).toBe("desktop");
    expect(of({ "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)" })).toBe("mobile");
    expect(of({ "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" })).toBe("desktop");
    expect(of({})).toBe("desktop");
  });
});

describe("ruta que se guarda", () => {
  it("sin el folio, sin la búsqueda y sin barra final", () => {
    expect(outboundPath("/cotizacion/enviada/COT-2027-000001")).toBe("/cotizacion/enviada");
    expect(outboundPath("/buscar/ana%20lopez")).toBe("/buscar");
    expect(outboundPath("/donde-comprar/quetzaltenango/")).toBe("/donde-comprar/quetzaltenango");
    expect(outboundPath("/")).toBe("/");
    expect(outboundPath("/cotizacion")).toBe("/cotizacion");
  });
});
