// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DUR, EASE, drawer, fadeScale, lineExit, sheet } from "./motion";

const css = readFileSync("src/styles/motion.css", "utf8");
const token = (name: string) => css.match(new RegExp(`--${name}:\\s*([^;]+);`))?.[1]?.trim();

describe("presets de Motion (BD-045)", () => {
  it("las duraciones son los tokens de motion.css (en segundos)", () => {
    expect(`${DUR.fast * 1000}ms`).toBe(token("dur-fast"));
    expect(`${DUR.base * 1000}ms`).toBe(token("dur-base"));
    expect(`${DUR.slow * 1000}ms`).toBe(token("dur-slow"));
  });

  it("las curvas son --ease-out y --ease-in", () => {
    expect(`cubic-bezier(${EASE.out.join(", ")})`).toBe(token("ease-out"));
    expect(`cubic-bezier(${EASE.in.join(", ")})`).toBe(token("ease-in"));
  });

  it("todos cambian la opacidad (con movimiento reducido es lo único que queda)", () => {
    for (const preset of [drawer, sheet, fadeScale, lineExit])
      expect(JSON.stringify(preset)).toContain('"opacity"');
  });

  it("solo animan transform y opacidad", () => {
    const allowed = new Set(["x", "y", "scale", "opacity", "transition"]);
    for (const preset of [drawer, sheet, fadeScale, lineExit]) {
      for (const [name, state] of Object.entries(preset)) {
        if (name === "transition") continue; // cómo animar, no qué
        for (const key of Object.keys(state)) expect(allowed, key).toContain(key);
      }
    }
  });
});
