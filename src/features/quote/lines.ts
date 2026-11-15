export { QUOTE_CHANGE_EVENT, QUOTE_STORAGE_KEY, countStoredLines } from "./storage-keys";
import {
  PACKAGING_CODES,
  QUOTE_ITEM_TYPES,
  QUOTE_LIMITS,
  type PackagingCode,
  type QuoteItemType,
} from "@/lib/constants";

/**
 * Lo puro de la cotización (BD-070): la forma de una línea, su clave, el saneo de lo guardado y
 * cómo se guarda. Sin zustand: el contador del header lo usa en todas las páginas sin cargar el
 * store (presupuesto de JS, docs/12 §2), y sirve también en el servidor (validación, BD-072).
 */
export type QuoteLine = {
  /** `${type}:${ref}:${packaging}`: el mismo SKU con la misma presentación es una sola línea. */
  key: string;
  type: QuoteItemType;
  /** SKU (variante), slug del kit o de la categoría. */
  ref: string;
  /** «Bolik Ultra». */
  name: string;
  /** «Azul · PT00058». */
  detail?: string;
  packaging?: PackagingCode;
  quantity: number;
  /** Ruta base de la imagen en /media. */
  image?: string;
  /** Ruta interna de la ficha («/productos/…»), para volver a ella. */
  url: string;
  addedAt: number;
};

export const QUOTE_STORAGE_VERSION = 1;

export const lineKey = (type: QuoteItemType, ref: string, packaging?: PackagingCode) =>
  `${type}:${ref}:${packaging ?? "-"}`;

/** Cantidad entera entre 1 y 9 999; lo que no es un número cuenta como 1. */
export const clampQuantity = (n: number) =>
  Math.min(QUOTE_LIMITS.maxQty, Math.max(QUOTE_LIMITS.minQty, Math.round(n) || 1));

const isOneOf = <T extends string>(list: readonly T[], value: unknown): value is T =>
  typeof value === "string" && (list as readonly string[]).includes(value);

/** Solo rutas del propio sitio («/productos/…»), nunca «//otro.com» ni una URL externa. */
const isInternalPath = (value: unknown): value is string =>
  typeof value === "string" && value.startsWith("/") && !value.startsWith("//");

/**
 * Lo guardado en el navegador, limpio: tipo y presentación válidos, ruta interna, cantidad entre 1
 * y 9 999 y la clave recalculada (sin repetidas: las cantidades se suman). Lo dañado se descarta
 * sin vaciar lo demás, y se recorta a 50 líneas. A mano y no con Zod: este módulo va en el JS de
 * todas las páginas (el contador del header) y Zod pesa más que el store entero.
 */
export function sanitizeLines(value: unknown): QuoteLine[] {
  if (!Array.isArray(value)) return [];
  const byKey = new Map<string, QuoteLine>();
  for (const raw of value) {
    if (typeof raw !== "object" || raw === null) continue;
    const line = raw as Partial<QuoteLine>;
    if (!isOneOf(QUOTE_ITEM_TYPES, line.type)) continue;
    if (typeof line.ref !== "string" || !line.ref || typeof line.name !== "string") continue;
    if (!isInternalPath(line.url)) continue;
    if (line.packaging !== undefined && !isOneOf(PACKAGING_CODES, line.packaging)) continue;
    const key = lineKey(line.type, line.ref, line.packaging);
    const quantity = clampQuantity(Number(line.quantity));
    const existing = byKey.get(key);
    if (existing) {
      existing.quantity = clampQuantity(existing.quantity + quantity);
      continue;
    }
    if (byKey.size >= QUOTE_LIMITS.maxLines) continue;
    byKey.set(key, {
      key,
      type: line.type,
      ref: line.ref,
      name: line.name,
      ...(typeof line.detail === "string" && { detail: line.detail }),
      ...(line.packaging && { packaging: line.packaging }),
      quantity,
      ...(typeof line.image === "string" && { image: line.image }),
      url: line.url,
      addedAt: typeof line.addedAt === "number" ? line.addedAt : 0,
    });
  }
  return [...byKey.values()];
}
