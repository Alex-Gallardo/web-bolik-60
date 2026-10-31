/**
 * SQL Server no tiene enum: los estados se guardan como texto y se validan con estos valores.
 * Uso: z.enum(QUOTE_STATUS), type QuoteStatus = (typeof QUOTE_STATUS)[number]
 */
export const ROLES = ["admin", "editor", "ventas"] as const;
export const LINE_GROUPS = ["escritura", "escolar", "arte", "oficina"] as const;
export const STORE_TYPES = ["cadena", "libreria", "distribuidor"] as const;
export const CUSTOMER_TYPES = [
  "libreria",
  "distribuidor",
  "colegio",
  "universidad",
  "empresa",
  "otro",
] as const;
export const QUOTE_STATUS = [
  "nueva",
  "en_proceso",
  "cotizada",
  "ganada",
  "perdida",
  "spam",
] as const;
export const ERP_STATUS = ["pendiente", "enviada", "error", "omitida"] as const;
export const QUOTE_ITEM_TYPES = ["variante", "kit", "categoria", "personalizado"] as const;
export const PACKAGING_CODES = ["blister1", "blister3", "blister5", "cajilla12", "fardo"] as const;
export const BACKGROUND_PRESETS = [
  "paper",
  "soft",
  "dots",
  "grid",
  "lines",
  "ink",
  "brand",
  "navy",
  "sun",
] as const;
export const FAQ_SCOPES = [
  "global",
  "home",
  "category",
  "product",
  "mayoreo",
  "escuelas",
  "empresas",
  "tiendas",
] as const;
export const CLICK_KINDS = ["whatsapp", "retailer", "maps", "phone", "pdf"] as const;

export type Role = (typeof ROLES)[number];
export type CustomerType = (typeof CUSTOMER_TYPES)[number];
export type QuoteStatus = (typeof QUOTE_STATUS)[number];
export type ErpStatus = (typeof ERP_STATUS)[number];
export type QuoteItemType = (typeof QUOTE_ITEM_TYPES)[number];
export type PackagingCode = (typeof PACKAGING_CODES)[number];
export type BackgroundPreset = (typeof BACKGROUND_PRESETS)[number];

export const PACKAGING_LABELS: Record<PackagingCode, { singular: string; plural: string }> = {
  blister1: { singular: "blister de 1", plural: "blisters de 1" },
  blister3: { singular: "blister de 3", plural: "blisters de 3" },
  blister5: { singular: "blister de 5", plural: "blisters de 5" },
  cajilla12: { singular: "cajilla de 12", plural: "cajillas de 12" },
  fardo: { singular: "fardo", plural: "fardos" },
};

/** Límites de la cotización del visitante (docs/07, feedback.quote.limit). */
export const QUOTE_LIMITS = { maxLines: 50, minQty: 1, maxQty: 9999 } as const;

/** Formularios públicos: anti-spam (docs/03 §8). */
export const FORM_GUARDS = {
  minFillMs: 3000,
  rateLimit: { max: 5, windowMs: 10 * 60 * 1000 },
} as const;
