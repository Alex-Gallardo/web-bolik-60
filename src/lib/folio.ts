import { TIME_ZONE } from "./format";

/**
 * Folios de las solicitudes (BD-033, docs/05 §4): `COT-2027-000123` (cotizaciones),
 * `ESC-2027-000045` (visitas escolares) y `DIS-2027-000012` (distribuidores). El consecutivo es
 * por prefijo y año y se reinicia cada 1 de enero, en hora de Guatemala.
 */

export const FOLIO_PREFIXES = ["COT", "ESC", "DIS"] as const;
export type FolioPrefix = (typeof FOLIO_PREFIXES)[number];

export const FOLIO_REGEX = /^(COT|ESC|DIS)-\d{4}-\d{6}$/;

/** Hasta 999 999 solicitudes por prefijo y año: el formato no se desborda. */
export const MAX_FOLIO_NUMBER = 999_999;

const yearFormat = new Intl.DateTimeFormat("en-US", { timeZone: TIME_ZONE, year: "numeric" });

/**
 * Año del folio en hora de Guatemala, no la del servidor: el 31 de diciembre desde las 18:00 en
 * Guatemala ya es 1 de enero en UTC, y esa solicitud sigue siendo del año que termina.
 */
export function folioYear(now: Date = new Date()): number {
  return Number(yearFormat.format(now));
}

export function formatFolio(prefix: FolioPrefix, year: number, n: number): string {
  if (!Number.isInteger(n) || n < 1 || n > MAX_FOLIO_NUMBER) {
    throw new RangeError(`Número de folio fuera de rango: ${n}`);
  }
  return `${prefix}-${year}-${String(n).padStart(6, "0")}`;
}

export function isFolioPrefix(value: string): value is FolioPrefix {
  return (FOLIO_PREFIXES as readonly string[]).includes(value);
}
