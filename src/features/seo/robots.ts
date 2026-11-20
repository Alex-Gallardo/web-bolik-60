import type { MetadataRoute } from "next";
import type { env } from "@/env";

type AppEnv = (typeof env)["APP_ENV"];

/**
 * Lo que ningún bot rastrea en producción (docs/10 §2): el admin, la API y el styleguide. Las
 * utilidades con `noindex, follow` (/buscar, /cotizacion) NO van aquí: si robots las bloquea,
 * Google no puede leer su noindex y podría indexar la URL sin contenido. /styleguide sí va aunque
 * lleve noindex (lo pide BD-026): nadie la enlaza y en producción responde 404.
 */
export const ROBOTS_DISALLOW = ["/admin", "/api/", "/styleguide"] as const;

/**
 * Bots de IA permitidos de forma explícita (doc 11 §2). Para no permitir entrenamiento basta pasar
 * GPTBot, ClaudeBot, Google-Extended y Applebot-Extended a una regla con `Disallow: /`.
 */
export const AI_BOTS = [
  "OAI-SearchBot",
  "ChatGPT-User",
  "GPTBot",
  "ClaudeBot",
  "Claude-User",
  "Claude-SearchBot",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot",
  "Applebot-Extended",
  "Bingbot",
] as const;

/**
 * /robots.txt (BD-092, docs/10 §5): staging bloquea todo (además manda `X-Robots-Tag: noindex`,
 * next.config.ts). Desarrollo sale igual que producción: es localhost, ningún buscador lo ve, y
 * así Lighthouse CI y la E2E (que corren con APP_ENV=development) revisan las reglas reales; con
 * `Disallow: /` la auditoría «is-crawlable» daba 0 y el SEO caía a 0.69. Un bot con grupo propio
 * ignora el de `*`, por eso el grupo de IA repite los mismos Disallow.
 */
export function buildRobots(appEnv: AppEnv, siteUrl: string): MetadataRoute.Robots {
  if (appEnv === "staging") return { rules: { userAgent: "*", disallow: "/" } };
  const disallow = [...ROBOTS_DISALLOW];
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow },
      { userAgent: [...AI_BOTS], allow: "/", disallow },
    ],
    sitemap: new URL("/sitemap.xml", siteUrl).toString(),
  };
}
