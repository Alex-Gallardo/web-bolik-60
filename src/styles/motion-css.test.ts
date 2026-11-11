// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("src/styles/motion.css", "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

/** Reglas de primer nivel dentro de un bloque: selector normalizado → declaraciones. */
function rules(block: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const [, selectors, body] of block.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const declarations = body!.replace(/\s+/g, " ").trim();
    for (const selector of selectors!.split(",")) map.set(selector.trim(), declarations);
  }
  return map;
}

/** Contenido de `@media (prefers-reduced-motion: reduce) { … }`. */
function mediaBlock(): string {
  const start = css.indexOf("@media (prefers-reduced-motion: reduce)");
  let depth = 0;
  for (let i = css.indexOf("{", start); i < css.length; i++) {
    if (css[i] === "{") depth++;
    else if (css[i] === "}" && --depth === 0) return css.slice(css.indexOf("{", start) + 1, i);
  }
  throw new Error("Sin bloque de movimiento reducido");
}

/** Reglas sueltas con [data-reduced-motion], sin el prefijo. */
function simulated(): Map<string, string> {
  const map = new Map<string, string>();
  for (const [selector, declarations] of rules(css)) {
    if (!selector.includes("[data-reduced-motion]") || selector === "[data-reduced-motion]")
      continue;
    // ".spin", ".js .x" o "html[data-reveal-ready] .x": el selector sin el atributo simulado.
    const plain = selector.replace("[data-reduced-motion]", "").trim();
    map.set(plain, declarations);
  }
  return map;
}

describe("movimiento reducido simulado (BD-026)", () => {
  it("tiene exactamente las mismas reglas que el bloque @media", () => {
    const real = rules(mediaBlock());
    expect(real.size).toBeGreaterThan(5);
    expect(Object.fromEntries(simulated())).toEqual(Object.fromEntries(real));
  });
});
