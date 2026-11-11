// @vitest-environment node
import { describe, expect, it } from "vitest";
import { FOLIO_REGEX, folioYear, formatFolio, isFolioPrefix } from "./folio";

describe("folios (BD-033)", () => {
  it("formato COT-AAAA-NNNNNN", () => {
    expect(formatFolio("COT", 2027, 123)).toBe("COT-2027-000123");
    expect(formatFolio("ESC", 2027, 45)).toBe("ESC-2027-000045");
    expect(formatFolio("DIS", 2027, 999_999)).toBe("DIS-2027-999999");
  });

  it("fuera de 1…999 999 no arma un folio inválido", () => {
    for (const n of [0, -1, 1_000_000, 1.5]) {
      expect(() => formatFolio("COT", 2027, n), String(n)).toThrow(RangeError);
    }
    expect(FOLIO_REGEX.test(formatFolio("COT", 2027, 1))).toBe(true);
  });

  it("la regex acepta solo folios válidos", () => {
    expect(FOLIO_REGEX.test("COT-2027-000123")).toBe(true);
    for (const value of ["COT-2027-123", "XYZ-2027-000123", "cot-2027-000123", "COT-27-000123"]) {
      expect(FOLIO_REGEX.test(value), value).toBe(false);
    }
  });

  it("reconoce solo los tres prefijos", () => {
    expect(isFolioPrefix("COT")).toBe(true);
    expect(isFolioPrefix("ESC")).toBe(true);
    expect(isFolioPrefix("DIS")).toBe(true);
    expect(isFolioPrefix("cot")).toBe(false);
    expect(isFolioPrefix("ABC")).toBe(false);
  });

  it("el año es el de Guatemala, no el del servidor (UTC-6)", () => {
    // 31 dic 23:59 en Guatemala = 1 ene 05:59 UTC: sigue siendo 2026.
    expect(folioYear(new Date("2027-01-01T05:59:59Z"))).toBe(2026);
    // 1 ene 00:00 en Guatemala = 06:00 UTC: ya es 2027.
    expect(folioYear(new Date("2027-01-01T06:00:00Z"))).toBe(2027);
    expect(folioYear(new Date("2027-06-15T12:00:00Z"))).toBe(2027);
  });
});
