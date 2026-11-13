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
/**
 * Presentaciones (Packaging.code). Las primeras cinco vienen del MVP (el Ultra y la cotización las
 * usan); las genéricas son las del catálogo 2026-2027 (BD-038): la cantidad va en unitsPerPack y el
 * texto completo en Packaging.name («Caja de 24», «Fardo de 72 cajas»).
 */
export const PACKAGING_CODES = [
  "blister1",
  "blister3",
  "blister5",
  "cajilla12",
  "fardo",
  "caja",
  "cajamaster",
  "bandeja",
  "sixpack",
  "estuche",
  "tubo",
  "bolsa",
  "bote",
  "blister",
  "unidad",
] as const;

/** Marcas del grupo en el catálogo 2026-2027 (BD-038). Product.brand; bolik por defecto. */
export const BRANDS = ["bolik", "fabik", "coloreto", "ecobol", "kpen"] as const;
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
/** MediaAsset.kind (docs/05). Un póster del hero puede subirse como imagen o como póster. */
export const MEDIA_KINDS = ["image", "video", "poster", "pdf"] as const;
export const MEDIA_IMAGE_KINDS: readonly (typeof MEDIA_KINDS)[number][] = ["image", "poster"];
export const CLICK_KINDS = ["whatsapp", "retailer", "maps", "phone", "pdf"] as const;

export type Role = (typeof ROLES)[number];
export type CustomerType = (typeof CUSTOMER_TYPES)[number];
export type QuoteStatus = (typeof QUOTE_STATUS)[number];
export type ErpStatus = (typeof ERP_STATUS)[number];
export type QuoteItemType = (typeof QUOTE_ITEM_TYPES)[number];
export type PackagingCode = (typeof PACKAGING_CODES)[number];
export type Brand = (typeof BRANDS)[number];
export type BackgroundPreset = (typeof BACKGROUND_PRESETS)[number];

export const PACKAGING_LABELS: Record<PackagingCode, { singular: string; plural: string }> = {
  blister1: { singular: "blíster de 1", plural: "blísteres de 1" },
  blister3: { singular: "blíster de 3", plural: "blísteres de 3" },
  blister5: { singular: "blíster de 5", plural: "blísteres de 5" },
  cajilla12: { singular: "cajilla de 12", plural: "cajillas de 12" },
  fardo: { singular: "fardo", plural: "fardos" },
  caja: { singular: "caja", plural: "cajas" },
  cajamaster: { singular: "caja máster", plural: "cajas máster" },
  bandeja: { singular: "bandeja", plural: "bandejas" },
  sixpack: { singular: "six pack", plural: "six packs" },
  estuche: { singular: "estuche", plural: "estuches" },
  tubo: { singular: "tubo", plural: "tubos" },
  bolsa: { singular: "bolsa", plural: "bolsas" },
  bote: { singular: "bote", plural: "botes" },
  blister: { singular: "blíster", plural: "blísteres" },
  unidad: { singular: "unidad", plural: "unidades" },
};

/**
 * Cómo se llama cada marca en SAP (parámetro `marca` de GET /api/web/articulos, doc 05 §8). Por
 * confirmar con SMART-K66 (BD-039, BD-128); la sincronización (BD-036) recorre todas.
 */
export const BRAND_ERP_NAMES: Record<Brand, string> = {
  bolik: "BOLIK",
  fabik: "FABIK",
  coloreto: "COLORETO",
  ecobol: "ECOBOL",
  kpen: "K-PEN",
};

/** Nombre de cada marca como lo escribe el catálogo. */
export const BRAND_LABELS: Record<Brand, string> = {
  bolik: "Bolik",
  fabik: "Fabik",
  coloreto: "Coloreto",
  ecobol: "EcoBol",
  kpen: "K-Pen",
};

/** Límites de la cotización del visitante (docs/07, feedback.quote.limit). */
export const QUOTE_LIMITS = { maxLines: 50, minQty: 1, maxQty: 9999 } as const;

/** Formularios públicos: anti-spam (docs/03 §8). */
export const FORM_GUARDS = {
  minFillMs: 3000,
  rateLimit: { max: 5, windowMs: 10 * 60 * 1000 },
} as const;
