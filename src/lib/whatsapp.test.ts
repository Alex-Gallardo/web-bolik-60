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
    expect(url).toBe(
      "https://wa.me/50255551234?text=" +
        encodeURIComponent("Hola, quiero cotizar:\n• Bolik Ultra azul (PT00058) × 12 & más #1"),
    );
    const text = new URL(url!).searchParams.get("text");
    expect(text).toBe("Hola, quiero cotizar:\n• Bolik Ultra azul (PT00058) × 12 & más #1");
  });

  it("omite el mensaje vacío", () => {
    expect(whatsappUrl("55551234", "   ")).toBe("https://wa.me/50255551234");
  });

  it("devuelve null con un número inválido (no se muestra el botón)", () => {
    expect(whatsappUrl("")).toBeNull();
    expect(whatsappUrl("123", "Hola")).toBeNull();
  });
});
