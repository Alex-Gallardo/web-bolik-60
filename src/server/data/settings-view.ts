import "server-only";
import { settingsSchema } from "../../../prisma/seed/schema";
import type { SiteSettings } from "./types";

/**
 * SiteSetting (clave → texto) a la vista que usan las páginas. Lo comparten la fuente de ejemplo
 * (settings.json) y la de SQL Server (tabla SiteSetting), así las dos dan lo mismo (BD-032).
 * Se valida con el esquema del seed: un ajuste obligatorio que falte da un error claro al
 * prerenderizar, no una página rota. Las claves que el esquema no conoce (agregadas después desde
 * el admin) se ignoran aquí, y un valor vacío cuenta como ausente: en la tabla, «borrar» un ajuste
 * opcional (WhatsApp, Facebook) deja "" y no debe tumbar el sitio.
 */
export function toSiteSettings(raw: Record<string, string | undefined>): SiteSettings {
  const known = Object.fromEntries(
    Object.entries(raw).filter(
      ([key, value]) => Object.hasOwn(settingsSchema.shape, key) && Boolean(value?.trim()),
    ),
  );
  const parsed = settingsSchema.safeParse(known);
  if (!parsed.success) {
    const keys = [...new Set(parsed.error.issues.map((i) => i.path.join(".")))].join(", ");
    throw new Error(`Ajustes del sitio (SiteSetting) inválidos o incompletos: ${keys}.`);
  }
  const s = parsed.data;
  return {
    phone: s.phone,
    address: s.address,
    businessHours: s.business_hours,
    legalName: s.legal_name,
    whatsappNumber: s.whatsapp_number ?? null,
    socialFacebook: s.social_facebook ?? null,
    splashEnabled: s.splash_enabled === "true",
    kitsEnabled: s.kits_enabled === "true",
    minCustomOrder: s.min_custom_order ? Number(s.min_custom_order) : null,
  };
}
