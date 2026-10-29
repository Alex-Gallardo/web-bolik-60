import type { MetadataRoute } from "next";
import { SITE } from "@/features/seo/metadata";

/**
 * Staging y desarrollo: no indexar nada.
 * Producción: todo indexable excepto utilidades; los bots de IA tienen acceso explícito
 * (queremos que ChatGPT, Gemini, Claude, Perplexity y Copilot citen a Bolik). Ver doc 11.
 */
export default function robots(): MetadataRoute.Robots {
  if (process.env.APP_ENV !== "production") {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }

  const disallow = ["/admin", "/api/", "/cotizacion", "/buscar", "/styleguide"];

  return {
    rules: [
      { userAgent: "*", allow: "/", disallow },
      // Bots de búsqueda e IA: permitidos (mismas exclusiones)
      { userAgent: ["Googlebot", "Bingbot", "OAI-SearchBot", "ChatGPT-User", "GPTBot", "ClaudeBot", "Claude-User", "Claude-SearchBot", "PerplexityBot", "Perplexity-User", "Google-Extended", "Applebot", "Applebot-Extended"], allow: "/", disallow },
    ],
    sitemap: `${SITE.url}/sitemap.xml`,
    host: SITE.url,
  };
}
