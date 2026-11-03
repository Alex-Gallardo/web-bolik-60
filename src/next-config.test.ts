// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

// next.config.ts valida las variables al cargarse: aquí se controla qué devuelve esa validación.
const schema = vi.hoisted(() => ({
  skip: true,
  parsed: {} as Record<string, string>,
}));
vi.mock("./env.schema", () => ({
  shouldSkipEnvValidation: () => schema.skip,
  parseServerEnv: () => schema.parsed,
}));

async function loadHeaders() {
  vi.resetModules();
  const { default: config } = await import("../next.config");
  return config.headers!();
}

const robotsOf = (rule: { headers: { key: string; value: string }[] }) =>
  rule.headers.find((header) => header.key === "X-Robots-Tag")?.value;

afterEach(() => {
  vi.unstubAllEnvs();
  schema.skip = true;
  schema.parsed = {};
});

describe("cabeceras de next.config", () => {
  it("en staging, noindex en todas las rutas y como última regla", async () => {
    // En staging la validación nunca se omite: APP_ENV sale de las variables validadas.
    schema.skip = false;
    schema.parsed = { APP_ENV: "staging", CSP_ENFORCE: "false" };
    const last = (await loadHeaders()).at(-1)!;
    expect(last.source).toBe("/:path*");
    expect(robotsOf(last)).toBe("noindex, nofollow");
  });

  it("sin validación (CI), toma APP_ENV del entorno", async () => {
    vi.stubEnv("APP_ENV", "staging");
    expect(robotsOf((await loadHeaders()).at(-1)!)).toBe("noindex, nofollow");
  });

  it.each(["development", "production"])(
    "en %s, noindex solo en páginas de utilidad",
    async (env) => {
      schema.skip = false;
      schema.parsed = { APP_ENV: env, CSP_ENFORCE: "false" };
      const rules = await loadHeaders();
      const sources = rules.filter((rule) => robotsOf(rule)).map((rule) => rule.source);
      expect(sources).toEqual(["/admin/:path*", "/styleguide/:path*", "/cotizacion/:path*"]);
    },
  );
});
