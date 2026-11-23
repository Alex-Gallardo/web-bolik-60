import { describe, expect, it } from "vitest";
import { FORM_GUARD, checkFormMeta } from "./form-guard";

describe("checkFormMeta (BD-077)", () => {
  it("campo trampa vacío y tiempo suficiente: ok", () => {
    expect(checkFormMeta({ website: "", elapsedMs: FORM_GUARD.minFillMs })).toBe("ok");
    expect(checkFormMeta({ elapsedMs: 60_000 })).toBe("ok");
  });

  it("campo trampa con algo: bot (aunque el tiempo sobre)", () => {
    expect(checkFormMeta({ website: "http://spam", elapsedMs: 60_000 })).toBe("bot");
    expect(checkFormMeta({ website: "x", elapsedMs: 1 })).toBe("bot");
  });

  it("solo espacios en el campo trampa no cuenta como bot", () => {
    expect(checkFormMeta({ website: "   ", elapsedMs: 60_000 })).toBe("ok");
  });

  it("antes del tiempo mínimo o sin un número válido: tooFast", () => {
    for (const elapsedMs of [FORM_GUARD.minFillMs - 1, undefined, "9999", Number.NaN, Infinity])
      expect(checkFormMeta({ website: "", elapsedMs })).toBe("tooFast");
  });
});
