import { describe, expect, it } from "vitest";
import { contrastRatio, hexToRgb } from "./contrast";

// Colores de referencia de WCAG, no de la interfaz.
const BLACK = "#000000"; // check-colors-ignore: valor de referencia de la prueba
const WHITE = "#ffffff"; // check-colors-ignore: valor de referencia de la prueba
const WHITE_UPPER = "#FFFFFF"; // check-colors-ignore: valor de referencia de la prueba
const BLUE = "#1d3fce"; // check-colors-ignore: valor de referencia de la prueba
const GRAY_AA = "#767676"; // check-colors-ignore: el gris más claro que cumple AA sobre blanco

describe("contraste WCAG", () => {
  it("convierte hex a RGB", () => {
    expect(hexToRgb(BLUE)).toEqual([29, 63, 206]);
    expect(hexToRgb(WHITE_UPPER)).toEqual([255, 255, 255]);
    expect(() => hexToRgb("azul")).toThrow("Color inválido");
  });

  it("negro sobre blanco es 21 y un color contra sí mismo es 1, sin importar el orden", () => {
    expect(contrastRatio(BLACK, WHITE)).toBeCloseTo(21, 5);
    expect(contrastRatio(WHITE, BLACK)).toBeCloseTo(21, 5);
    expect(contrastRatio(BLUE, BLUE)).toBe(1);
  });

  it("coincide con valores de referencia", () => {
    expect(contrastRatio(GRAY_AA, WHITE)).toBeCloseTo(4.54, 2);
  });
});
