import { describe, expect, it } from "vitest";
import { isSearchableCode, normalizeCode } from "./variant-code";

describe("códigos de búsqueda", () => {
  it("normaliza espacios, guiones y mayúsculas", () => {
    expect(normalizeCode(" pt-00058 ")).toBe("PT00058");
    expect(normalizeCode("7593 6466 3092")).toBe("759364663092");
  });

  it("solo busca SKU y códigos de barras plausibles", () => {
    expect(isSearchableCode("PT00058")).toBe(true);
    expect(isSearchableCode("759364663092")).toBe(true);
    expect(isSearchableCode("")).toBe(false);
    expect(isSearchableCode("AB")).toBe(false);
    expect(isSearchableCode("PT00058;DROP")).toBe(false);
    expect(isSearchableCode("X".repeat(31))).toBe(false);
  });
});
