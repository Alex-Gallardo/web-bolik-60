/**
 * Formatos para Guatemala (es-GT). Funciones puras: mismo resultado en servidor y navegador.
 * Las fechas siempre en hora de Guatemala; el servidor puede correr en UTC.
 */

export const LOCALE = "es-GT";
export const TIME_ZONE = "America/Guatemala";
const GT_COUNTRY_CODE = "502";

const numberFormat = new Intl.NumberFormat(LOCALE);
const dateFormats = {
  long: new Intl.DateTimeFormat(LOCALE, { dateStyle: "long", timeZone: TIME_ZONE }),
  short: new Intl.DateTimeFormat(LOCALE, { dateStyle: "short", timeZone: TIME_ZONE }),
};

/** 1800 → "1,800" · 1234.5 → "1,234.5" */
export function formatNumber(value: number): string {
  return numberFormat.format(value);
}

/** Fecha en hora de Guatemala: "30 de octubre de 2026" (long) o "30/10/26" (short). */
export function formatDate(value: Date | string, style: keyof typeof dateFormats = "long"): string {
  return dateFormats[style].format(typeof value === "string" ? new Date(value) : value);
}

/**
 * Teléfono guatemalteco a sus 8 dígitos nacionales. Acepta espacios, guiones, paréntesis y el
 * prefijo +502 / 502 / 00502. Devuelve null si no son 8 dígitos.
 */
export function normalizeGtPhone(input: string): string | null {
  let digits = input.replace(/\D/g, "");
  if (digits.startsWith(`00${GT_COUNTRY_CODE}`)) digits = digits.slice(5);
  else if (digits.length === 11 && digits.startsWith(GT_COUNTRY_CODE)) digits = digits.slice(3);
  return /^\d{8}$/.test(digits) ? digits : null;
}

/** "66282600" → "+502 6628 2600" (para mostrar). El original si no es un teléfono válido. */
export function formatPhone(input: string): string {
  const digits = normalizeGtPhone(input);
  return digits ? `+${GT_COUNTRY_CODE} ${digits.slice(0, 4)} ${digits.slice(4)}` : input;
}

/** Formato internacional sin "+" para tel: y wa.me: "50266282600". null si no es válido. */
export function toInternationalPhone(input: string): string | null {
  const digits = normalizeGtPhone(input);
  return digits ? `${GT_COUNTRY_CODE}${digits}` : null;
}
