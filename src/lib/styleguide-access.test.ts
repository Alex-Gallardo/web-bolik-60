import { describe, expect, it } from "vitest";
import { isStyleguideVisible } from "./styleguide-access";

describe("acceso a /styleguide (BD-026)", () => {
  it("se ve en desarrollo y staging, con o sin sesión", () => {
    for (const appEnv of ["development", "staging"] as const) {
      expect(isStyleguideVisible(appEnv, false)).toBe(true);
      expect(isStyleguideVisible(appEnv, true)).toBe(true);
    }
  });

  it("en producción solo con sesión de admin (sin ella, 404)", () => {
    expect(isStyleguideVisible("production", false)).toBe(false);
    expect(isStyleguideVisible("production", true)).toBe(true);
  });
});
