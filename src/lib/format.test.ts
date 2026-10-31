// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  formatDate,
  formatNumber,
  formatPhone,
  normalizeGtPhone,
  toInternationalPhone,
} from "./format";

describe("formatNumber", () => {
  it("usa coma de miles y punto decimal (es-GT)", () => {
    expect(formatNumber(1800)).toBe("1,800");
    expect(formatNumber(1234567.5)).toBe("1,234,567.5");
    expect(formatNumber(60)).toBe("60");
  });
});

describe("formatDate", () => {
  it("usa la hora de Guatemala aunque el servidor esté en UTC", () => {
    // 03:00 UTC del 31 de octubre = 21:00 del 30 de octubre en Guatemala (UTC-6).
    expect(formatDate(new Date("2026-10-31T03:00:00Z"))).toBe("30 de octubre de 2026");
    expect(formatDate("2026-10-31T03:00:00Z", "short")).toBe("30/10/26");
  });

  it("acepta texto ISO y formato largo por defecto", () => {
    expect(formatDate("2027-01-11T15:00:00Z")).toBe("11 de enero de 2027");
  });
});

describe("normalizeGtPhone", () => {
  it.each([
    ["6628 2600", "66282600"],
    ["6628-2600", "66282600"],
    ["+502 6628 2600", "66282600"],
    ["(502) 6628-2600", "66282600"],
    ["00502 66282600", "66282600"],
    ["50266282600", "66282600"],
  ])("normaliza %s", (input, expected) => {
    expect(normalizeGtPhone(input)).toBe(expected);
  });

  it.each(["", "6628 260", "6628 26001", "+1 555 123 4567", "teléfono"])("rechaza %j", (input) => {
    expect(normalizeGtPhone(input)).toBeNull();
  });
});

describe("formatPhone y toInternationalPhone", () => {
  it("muestra +502 XXXX XXXX y deja igual lo inválido", () => {
    expect(formatPhone("66282600")).toBe("+502 6628 2600");
    expect(formatPhone("123")).toBe("123");
  });

  it("da el formato internacional para tel: y wa.me", () => {
    expect(toInternationalPhone("6628-2600")).toBe("50266282600");
    expect(toInternationalPhone("123")).toBeNull();
  });
});
