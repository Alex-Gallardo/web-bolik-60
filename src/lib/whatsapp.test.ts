// @vitest-environment node
import { describe, expect, it } from "vitest";
import { WHATSAPP_MAX_ITEMS, whatsappEventData, whatsappMessage, whatsappUrl } from "./whatsapp";

describe("whatsappUrl", () => {
  it("arma el enlace con el código de país", () => {
    expect(whatsappUrl("5555 1234")).toBe("https://wa.me/50255551234");
    expect(whatsappUrl("+502 5555-1234")).toBe("https://wa.me/50255551234");
  });

  it("codifica el mensaje (tildes, ñ, saltos de línea, & y #)", () => {
    const url = whatsappUrl(
      "55551234",
      "Hola, quiero cotizar:\n• Bolik Ultra azul (PT00058) × 12 & más #1",
    );
    expect(url).toMatch(/^https:\/\/wa\.me\/50255551234\?text=Hola%2C%20quiero/);
    // Fragmentos literales: salto de línea, &, # y vocal con tilde codificados.
    for (const fragment of ["%0A", "%26", "%23", "m%C3%A1s"]) expect(url).toContain(fragment);
    expect(url).not.toMatch(/[\n &#]/);
    const text = new URL(url!).searchParams.get("text");
    expect(text).toBe("Hola, quiero cotizar:\n• Bolik Ultra azul (PT00058) × 12 & más #1");
  });

  it("no lanza con un emoji cortado al truncar", () => {
    const cut = "Hola 😀".slice(0, -1); // deja un surrogate suelto
    expect(() => whatsappUrl("55551234", cut)).not.toThrow();
    expect(whatsappUrl("55551234", cut)).toMatch(/^https:\/\/wa\.me\/50255551234\?text=Hola/);
  });

  it("omite el mensaje vacío", () => {
    expect(whatsappUrl("55551234", "   ")).toBe("https://wa.me/50255551234");
  });

  it("devuelve null con un número inválido (no se muestra el botón)", () => {
    expect(whatsappUrl("")).toBeNull();
    expect(whatsappUrl("123", "Hola")).toBeNull();
  });
});

describe("plantillas de WhatsApp (BD-067)", () => {
  const ultra = {
    name: "Bolik Ultra Azul",
    sku: "PT00058",
    packaging: "cajilla de 12",
    quantity: 20,
  };
  const url = "https://www.bolik66.com/productos/boligrafos/bolik-ultra?color=azul";

  it("producto: nombre, SKU, presentación, cantidad y URL", () => {
    const message = whatsappMessage({ context: "product", item: ultra, url });
    expect(message).toBe(
      `Hola, Bolik. Me interesa Bolik Ultra Azul (PT00058), cajilla de 12 × 20. ¿Me pueden dar precio y disponibilidad? ${url}`,
    );
    // Llega entero por el enlace.
    expect(new URL(whatsappUrl("55551234", message)!).searchParams.get("text")).toBe(message);
  });

  it("sin presentación o sin cantidad, esa parte no aparece", () => {
    expect(
      whatsappMessage({
        context: "product",
        item: { name: "Bolik Ultra Azul", sku: "PT00058" },
        url,
      }),
    ).toContain("Me interesa Bolik Ultra Azul (PT00058). ¿Me pueden");
    expect(
      whatsappMessage({ context: "product", item: { ...ultra, quantity: undefined }, url }),
    ).toContain("(PT00058), cajilla de 12. ");
    expect(
      whatsappMessage({ context: "product", item: { ...ultra, packaging: undefined }, url }),
    ).toContain("(PT00058), 20 unidades. ");
    expect(
      whatsappMessage({
        context: "product",
        item: { ...ultra, packaging: undefined, quantity: 1 },
        url,
      }),
    ).toContain("(PT00058), 1 unidad. ");
  });

  it("cotización: una línea por producto, hasta 10 y «y N productos más»", () => {
    expect(whatsappMessage({ context: "quote", items: [ultra] })).toBe(
      "Hola, Bolik. Quiero cotizar:\n• Bolik Ultra Azul (PT00058), cajilla de 12 × 20\n¿Me pueden dar precio y disponibilidad?",
    );
    const items = Array.from({ length: WHATSAPP_MAX_ITEMS + 3 }, (_, i) => ({
      ...ultra,
      sku: `PT${String(i).padStart(5, "0")}`,
      quantity: 1_200,
    }));
    const lines = whatsappMessage({ context: "quote", items }).split("\n");
    expect(lines.filter((l) => l.startsWith("• Bolik"))).toHaveLength(WHATSAPP_MAX_ITEMS);
    expect(lines).toContain("• y 3 productos más");
    expect(lines[1]).toContain("× 1,200");
    // Sin productos (no debería pasar): el mensaje general, nunca «Quiero cotizar:» vacío.
    expect(whatsappMessage({ context: "quote", items: [] })).toBe(
      whatsappMessage({ context: "general" }),
    );
  });

  it("folio y mensaje general, sin datos personales", () => {
    expect(whatsappMessage({ context: "sent", folio: "COT-2027-000123" })).toBe(
      "Hola, Bolik. Envié la cotización COT-2027-000123. ¿Me pueden ayudar con el seguimiento?",
    );
    expect(whatsappMessage({ context: "general" })).toBe(
      "Hola, Bolik. Quiero información sobre sus productos y precios por mayor.",
    );
  });

  it("atributos de analítica: whatsapp_open con contexto y SKU solo en la ficha", () => {
    expect(whatsappEventData("general")).toEqual({
      "data-event": "whatsapp_open",
      "data-context": "general",
    });
    expect(whatsappEventData("product", "PT00058")).toEqual({
      "data-event": "whatsapp_open",
      "data-context": "product",
      "data-sku": "PT00058",
    });
  });
});
