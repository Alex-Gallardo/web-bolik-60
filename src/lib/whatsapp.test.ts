// @vitest-environment node
import { describe, expect, it } from "vitest";
import { whatsappUrl } from "./whatsapp";

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
