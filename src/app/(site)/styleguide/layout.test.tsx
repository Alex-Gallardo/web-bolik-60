// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

// El entorno lo decide cada prueba; las fuentes de next/font no cargan fuera de Next.
const env = { APP_ENV: "development" as "development" | "staging" | "production" };
vi.mock("@/env", () => ({ env }));
vi.mock("@/app/fonts", () => ({ baloo: { variable: "font-baloo" } }));

const { default: StyleguideLayout } = await import("./layout");

afterEach(() => {
  env.APP_ENV = "development";
});

describe("layout de /styleguide (BD-026)", () => {
  it("en producción, sin sesión de admin, responde 404", async () => {
    env.APP_ENV = "production";
    await expect(StyleguideLayout({ children: null })).rejects.toMatchObject({
      digest: expect.stringContaining("404"),
    });
  });

  it("en desarrollo y staging se muestra", async () => {
    for (const appEnv of ["development", "staging"] as const) {
      env.APP_ENV = appEnv;
      await expect(StyleguideLayout({ children: null })).resolves.toBeTruthy();
    }
  });
});
