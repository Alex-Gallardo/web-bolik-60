// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  BACKGROUND_PRESETS,
  PACKAGING_CODES,
  PACKAGING_LABELS,
  QUOTE_LIMITS,
  ROLES,
} from "./constants";

describe("constants", () => {
  it("cada fondo de BACKGROUND_PRESETS existe en backgrounds.css y viceversa", () => {
    const css = readFileSync(new URL("../styles/backgrounds.css", import.meta.url), "utf8");
    const inCss = new Set([...css.matchAll(/\[data-bg="([\w-]+)"\]/g)].map((m) => m[1]));
    expect([...inCss].sort()).toEqual([...BACKGROUND_PRESETS].sort());
  });

  it("cada empaque tiene su texto en singular y plural", () => {
    expect(Object.keys(PACKAGING_LABELS).sort()).toEqual([...PACKAGING_CODES].sort());
    for (const code of PACKAGING_CODES) {
      expect(PACKAGING_LABELS[code].singular).not.toBe("");
      expect(PACKAGING_LABELS[code].plural).not.toBe("");
    }
  });

  it("límites de la cotización coherentes con docs/07", () => {
    expect(QUOTE_LIMITS).toEqual({ maxLines: 50, minQty: 1, maxQty: 9999 });
  });

  it("los roles del admin son los del doc 05", () => {
    expect(ROLES).toEqual(["admin", "editor", "ventas"]);
  });
});
