import { whatsappText as text } from "@/content/whatsapp";
import { formatNumber, toInternationalPhone } from "./format";

/**
 * Enlace de WhatsApp con mensaje prellenado. El número viene de SiteSetting (nunca escrito en el
 * código). Devuelve null si el número no es un teléfono guatemalteco válido, para no mostrar un
 * botón roto.
 */
export function whatsappUrl(phone: string, message?: string): string | null {
  const number = toInternationalPhone(phone);
  if (!number) return null;
  // toWellFormed: un emoji cortado al truncar el mensaje haría lanzar a encodeURIComponent.
  const clean = message?.trim().toWellFormed();
  return clean
    ? `https://wa.me/${number}?text=${encodeURIComponent(clean)}`
    : `https://wa.me/${number}`;
}

/** Un producto en el mensaje: «Bolik Ultra Azul (PT00058), cajilla de 12 × 20». */
export type WhatsAppItem = {
  /** «Bolik Ultra Azul»: nombre y color, como se ve en la ficha. */
  name: string;
  sku: string;
  /** Texto de la presentación («cajilla de 12»); sin ella, no se menciona. */
  packaging?: string;
  quantity?: number;
};

export type WhatsAppContext =
  | { context: "general" }
  /** Ficha de producto (BD-062): `url` absoluta de la ficha con su color. */
  | { context: "product"; item: WhatsAppItem; url: string }
  /** Cotización armada y sin enviar (drawer y /cotizacion, BD-071 y BD-072). */
  | { context: "quote"; items: WhatsAppItem[] }
  /** Cotización ya enviada (BD-073). */
  | { context: "sent"; folio: string };

/** Líneas de la cotización que caben en el mensaje; las demás se resumen. */
export const WHATSAPP_MAX_ITEMS = 10;

function describeItem(item: WhatsAppItem): string {
  const quantity = item.quantity ? formatNumber(item.quantity) : null;
  // Sin presentación, la cantidad dice «unidades»: Ventas no tiene que preguntar de qué.
  const pack = item.packaging
    ? [item.packaging, quantity ? `× ${quantity}` : null].filter(Boolean).join(" ")
    : quantity && text.units(quantity);
  return `${item.name} (${item.sku})${pack ? `, ${pack}` : ""}`;
}

/**
 * Texto del mensaje según dónde esté el visitante (BD-067, docs/07). Producto: nombre, código,
 * presentación, cantidad y URL de la ficha. Cotización: hasta 10 líneas y «y N productos más».
 * Folio: el número de seguimiento. Sin datos personales.
 */
export function whatsappMessage(input: WhatsAppContext): string {
  switch (input.context) {
    case "general":
      return text.general;
    case "product":
      return `${text.greeting} ${text.interested} ${describeItem(input.item)}. ${text.question} ${input.url}`;
    case "quote": {
      if (input.items.length === 0) return text.general;
      const shown = input.items
        .slice(0, WHATSAPP_MAX_ITEMS)
        .map((item) => `• ${describeItem(item)}`);
      const rest = input.items.length - shown.length;
      if (rest > 0) shown.push(`• ${text.more(rest)}`);
      return [`${text.greeting} ${text.quoteIntro}`, ...shown, text.question].join("\n");
    }
    case "sent":
      return `${text.greeting} ${text.sent(input.folio)}`;
  }
}

export { whatsappEventData, type WhatsAppEventContext } from "./whatsapp-event";
