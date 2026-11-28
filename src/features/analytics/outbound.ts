import { z } from "zod";
import type { CLICK_KINDS } from "@/lib/constants";
import { safeSlug } from "@/lib/slug";
import { WHATSAPP_CONTEXTS } from "@/lib/whatsapp-event";

/**
 * Clics salientes (BD-083, docs/12 §4): a qué tipo de OutboundClick va cada evento de los enlaces
 * marcados con data-event. Solo se cuentan los que salen del sitio (el script lo revisa).
 */
export const OUTBOUND_EVENTS = {
  retailer_click: "retailer",
  maps_click: "maps",
  whatsapp_open: "whatsapp",
} as const satisfies Record<string, (typeof CLICK_KINDS)[number]>;

export type OutboundEvent = keyof typeof OUTBOUND_EVENTS;

/** Adónde manda el navegador cada clic (navigator.sendBeacon). */
export const BEACON_PATH = "/api/beacon";

/** Un aviso real pesa ~150 bytes; más de 2 KB se rechaza (criterio de BD-083). */
export const BEACON_MAX_BYTES = 2_048;

const slugField = z
  .string()
  .max(100)
  .transform((value, ctx) => {
    const slug = safeSlug(value);
    if (!slug) ctx.addIssue({ code: "custom", message: "slug inválido" });
    return slug ?? "";
  });

/**
 * Lo que manda el script (claves de una letra: cada byte viaja en cada clic). Nunca datos
 * personales: el evento, los slugs del enlace (tienda, departamento), el SKU, el contexto de
 * WhatsApp y la ruta de la página sin query.
 */
export const beaconSchema = z
  .object({
    /** Evento (data-event). */
    e: z.enum(Object.keys(OUTBOUND_EVENTS) as [OutboundEvent, ...OutboundEvent[]]),
    /** Ruta de la página, sin query ni hash. */
    p: z
      .string()
      .max(300)
      .regex(/^\/[A-Za-z0-9\-._~%/]*$/),
    /** data-retailer: la tienda en línea (su slug). */
    r: slugField.optional(),
    /** data-store: la tienda de «Cómo llegar». */
    s: slugField.optional(),
    /** data-department. */
    d: slugField.optional(),
    /** data-sku (código SAP, PT00058). */
    k: z
      .string()
      .regex(/^[A-Za-z0-9-]{1,30}$/)
      .optional(),
    /** data-context de WhatsApp (lib/whatsapp-event.ts). */
    c: z.enum(WHATSAPP_CONTEXTS).optional(),
  })
  .strict();

export type BeaconPayload = z.infer<typeof beaconSchema>;

/** Una fila de OutboundClick, con slugs y SKU (la capa de datos busca sus ids). */
export type OutboundClickInput = {
  kind: (typeof CLICK_KINDS)[number];
  /** walmart · latorre · google_maps · el contexto de WhatsApp. */
  target: string | null;
  storeSlug: string | null;
  departmentSlug: string | null;
  sku: string | null;
  path: string;
  deviceType: "mobile" | "desktop";
};

/**
 * Rutas que llevan un dato de una persona o de lo que buscó: se guardan sin él. El folio de
 * /cotizacion/enviada/{folio} lleva a la cotización (nombre, correo, teléfono); /buscar/{q}, a su
 * búsqueda.
 */
const PATH_TEMPLATES = ["/cotizacion/enviada", "/buscar"] as const;

/** La ruta que se guarda: sin barra final y con la plantilla de las rutas con datos. */
export function outboundPath(path: string): string {
  const template = PATH_TEMPLATES.find((prefix) => path.startsWith(`${prefix}/`));
  if (template) return template;
  return path.length > 1 ? path.replace(/\/+$/, "") || "/" : path;
}

/** Del aviso del navegador a la fila. */
export function toOutboundClick(
  payload: BeaconPayload,
  deviceType: OutboundClickInput["deviceType"],
): OutboundClickInput {
  const kind = OUTBOUND_EVENTS[payload.e];
  const target =
    kind === "retailer"
      ? (payload.r ?? null)
      : kind === "maps"
        ? "google_maps"
        : (payload.c ?? "general");
  return {
    kind,
    target,
    // La tienda en línea es una tienda (Walmart, La Torre); «Cómo llegar», la de la tarjeta.
    storeSlug: (kind === "retailer" ? payload.r : payload.s) ?? null,
    departmentSlug: payload.d ?? null,
    sku: payload.k?.toUpperCase() ?? null,
    path: outboundPath(payload.p),
    deviceType,
  };
}

/**
 * Móvil o escritorio, de las cabeceras: Sec-CH-UA-Mobile (Chromium) y, si no viene, el user agent.
 * El navegador no manda nada para esto.
 */
export function deviceTypeOf(headers: Pick<Headers, "get">): OutboundClickInput["deviceType"] {
  const hint = headers.get("sec-ch-ua-mobile");
  if (hint === "?1") return "mobile";
  if (hint === "?0") return "desktop";
  return /Mobi|Android|iPhone|iPad|iPod/i.test(headers.get("user-agent") ?? "")
    ? "mobile"
    : "desktop";
}
