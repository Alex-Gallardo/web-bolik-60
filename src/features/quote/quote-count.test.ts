import { describe, expect, it } from "vitest";
import { parseQuoteCount } from "./quote-count";

describe("parseQuoteCount (BD-041)", () => {
  it("lee las líneas del formato de zustand persist", () => {
    const stored = (n: number) =>
      JSON.stringify({ state: { lines: Array.from({ length: n }, () => ({})) }, version: 1 });
    expect(parseQuoteCount(null)).toBe(0);
    expect(parseQuoteCount(stored(3))).toBe(3);
    expect(parseQuoteCount("{dañado")).toBe(0);
    expect(parseQuoteCount(JSON.stringify({ state: {} }))).toBe(0);
  });
});
