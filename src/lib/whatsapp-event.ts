/** Contextos para la analítica (docs/12 §4): una cotización enviada (folio) cuenta como `quote`. */
export const WHATSAPP_CONTEXTS = ["general", "product", "quote"] as const;
export type WhatsAppEventContext = (typeof WHATSAPP_CONTEXTS)[number];

/**
 * Atributos del enlace para la analítica (docs/12 §4, BD-067): `whatsapp_open` con su contexto y,
 * en la ficha, el SKU. Los registra el beacon de analítica (BD-127). Aparte de lib/whatsapp.ts: lo
 * usan islas de cliente (menú móvil, pantalla de error) y así no arrastran los textos.
 */
export function whatsappEventData(context: WhatsAppEventContext, sku?: string) {
  return {
    "data-event": "whatsapp_open",
    "data-context": context,
    ...(sku ? { "data-sku": sku } : {}),
  } as const;
}
