// @vitest-environment node
import { describe, expect, it } from "vitest";
import { isValidGtin } from "./gtin";

describe("isValidGtin", () => {
  it("acepta los UPC del Bolik Ultra y otros GTIN válidos", () => {
    for (const code of [
      "759364663092", // PT00058 azul
      "759364663108", // PT00059 negro
      "759364663115", // PT00060 rojo (catálogo 2026-2027)
      "4006381333931", // EAN-13
      "96385074", // EAN-8
      "10012345678902", // GTIN-14
    ]) {
      expect(isValidGtin(code), code).toBe(true);
    }
  });

  it("rechaza un dígito cambiado o dos vecinos invertidos", () => {
    expect(isValidGtin("759364663116")).toBe(false); // verificador equivocado
    expect(isValidGtin("759364663105")).toBe(false); // el del negro con el final del rojo
    expect(isValidGtin("759364636092")).toBe(false); // 6 y 3 vecinos invertidos
  });

  it("rechaza largos que no son GTIN y lo que no es solo dígitos", () => {
    for (const code of [
      "",
      "1234567",
      "75936466309",
      "123456789012345",
      "7593 6466 3092",
      "75936466309a",
    ]) {
      expect(isValidGtin(code), code).toBe(false);
    }
  });
});
