import { describe, expect, it } from "vitest";
import { zoomScale } from "./zoom";

describe("zoomScale (BD-062)", () => {
  it("amplía lo que da la resolución de la foto, hasta 2x", () => {
    // Foto provisional del Bolik Ultra (750 px) vista a 560 px.
    expect(zoomScale(750, 560)).toBe(1.34);
    // Foto de 3125 px: tope de 2x.
    expect(zoomScale(3125, 560)).toBe(2);
  });

  it("el umbral es 1.15x", () => {
    expect(zoomScale(1150, 1000)).toBe(1.15);
    expect(zoomScale(1149, 1000)).toBeNull();
  });

  it("no amplía si casi no se nota o si no se puede medir", () => {
    expect(zoomScale(-750, 560)).toBeNull();
    expect(zoomScale(Number.POSITIVE_INFINITY, 560)).toBe(2);
    expect(zoomScale(600, 560)).toBeNull();
    expect(zoomScale(750, 0)).toBeNull(); // conjunto oculto: aún sin ancho
    expect(zoomScale(0, 560)).toBeNull();
    expect(zoomScale(Number.NaN, 560)).toBeNull();
  });
});
