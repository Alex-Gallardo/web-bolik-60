import type { VariantMatch } from "./types";

/**
 * Búsqueda por código (QR, buscador): lo que escribe el visitante se normaliza y se valida antes
 * de tocar la caché, y se busca en memoria dentro del índice de variantes (una sola entrada de
 * caché para todos los códigos).
 */

/** Sin espacios ni guiones, en mayúsculas: " pt-00058 " → "PT00058". */
export function normalizeCode(code: string): string {
  return code.replace(/[\s-]/g, "").toUpperCase();
}

/** Un SKU (letras y números) o un código de barras de 8 a 14 dígitos; lo demás ni se busca. */
export function isSearchableCode(normalized: string): boolean {
  return /^[A-Z0-9]{3,30}$/.test(normalized);
}

export function matchVariantCode(matches: VariantMatch[], code: string): VariantMatch | null {
  const wanted = normalizeCode(code);
  if (!isSearchableCode(wanted)) return null;
  return (
    matches.find((m) => normalizeCode(m.variant.sku) === wanted || m.variant.barcode === wanted) ??
    null
  );
}
