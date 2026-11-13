import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// BD-055: el favicon se pide con prioridad alta en la carga de cada página. Era un ICO de 15 KB con
// tres cuadros BMP (48, 32 y 16 px); ahora lleva los mismos píxeles de 32 y 16 px como PNG.
describe("favicon.ico (BD-055)", () => {
  const ico = readFileSync("src/app/favicon.ico");

  it("pesa menos de 4 KB", () => {
    expect(ico.length).toBeLessThan(4 * 1024);
  });

  it("es un ICO con cuadros PNG de 32 y 16 px", () => {
    expect(ico.readUInt16LE(2)).toBe(1); // tipo ícono
    const count = ico.readUInt16LE(4);
    const frames = Array.from({ length: count }, (_, i) => {
      const entry = 6 + 16 * i;
      const offset = ico.readUInt32LE(entry + 12);
      return {
        size: ico[entry],
        png: ico.subarray(offset, offset + 4).toString("hex") === "89504e47",
      };
    });
    expect(frames).toEqual([
      { size: 32, png: true },
      { size: 16, png: true },
    ]);
  });
});
