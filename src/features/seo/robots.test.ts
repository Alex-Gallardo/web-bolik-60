import { describe, expect, it } from "vitest";
import { AI_BOTS, ROBOTS_DISALLOW, buildRobots } from "./robots";

const SITE_URL = "https://www.bolik66.com";

describe("robots.txt (BD-092, docs/10 §5)", () => {
  it("en staging bloquea todo y no anuncia sitemap", () => {
    const robots = buildRobots("staging", "https://staging.bolik66.com");
    expect(robots.rules).toEqual({ userAgent: "*", disallow: "/" });
    expect(robots.sitemap).toBeUndefined();
  });

  it("desarrollo sale igual que producción (Lighthouse CI y la E2E revisan las reglas reales)", () => {
    expect(buildRobots("development", SITE_URL)).toEqual(buildRobots("production", SITE_URL));
  });

  it("en producción abre el sitio salvo admin, API y styleguide, y anuncia el sitemap", () => {
    const robots = buildRobots("production", SITE_URL);
    expect(robots.sitemap).toBe("https://www.bolik66.com/sitemap.xml");
    const rules = Array.isArray(robots.rules) ? robots.rules : [robots.rules];
    expect(rules[0]).toEqual({ userAgent: "*", allow: "/", disallow: [...ROBOTS_DISALLOW] });
    expect(ROBOTS_DISALLOW).toEqual(["/admin", "/api/", "/styleguide"]);
  });

  it("las utilidades con noindex no se bloquean: Google tiene que poder leer su noindex", () => {
    const rules = buildRobots("production", SITE_URL).rules;
    const disallowed = (Array.isArray(rules) ? rules : [rules]).flatMap((r) => r.disallow ?? []);
    for (const path of ["/buscar", "/cotizacion"])
      expect(disallowed.some((rule) => path.startsWith(rule))).toBe(false);
  });

  it("los bots de IA de doc 11 están permitidos y repiten los mismos Disallow", () => {
    const rules = buildRobots("production", SITE_URL).rules;
    const ai = (Array.isArray(rules) ? rules : [rules])[1]!;
    expect(ai.userAgent).toEqual([...AI_BOTS]);
    expect(ai.allow).toBe("/");
    // Un bot con grupo propio ignora el de `*`: sin esto podría rastrear /admin.
    expect(ai.disallow).toEqual([...ROBOTS_DISALLOW]);
    for (const bot of ["GPTBot", "ClaudeBot", "PerplexityBot", "Google-Extended", "Bingbot"])
      expect(AI_BOTS).toContain(bot);
  });
});
