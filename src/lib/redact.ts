/**
 * Limpia datos personales y secretos antes de escribirlos en un log (docs/15 §9, docs/05 §10).
 * - Claves sensibles, a cualquier profundidad y en arreglos: el valor pasa a "[oculto]".
 * - Textos (incluidos message y stack de los errores): correos y teléfonos se enmascaran, porque
 *   Prisma o nodemailer copian valores del visitante en sus mensajes.
 */

export const CENSOR = "[oculto]";

/** Por nombre de clave, sin importar mayúsculas: correo, customerEmail, telefono, phoneNumber… */
const SENSITIVE_KEY =
  /e-?mail|correo|phone|tel[eé]fono|celular|whatsapp|password|contrase|token|secret|cookie|authorization|^nit$|^dpi$|^nombre|^name$|full_?name|first_?name|last_?name|contact_?name|customer_?name|direcci[oó]n|address/i;

const EMAIL = /[^\s@"'<>(),;:]+@[^\s@"'<>(),;:]+\.[a-z]{2,}/gi;
/** 8 dígitos de Guatemala, con o sin +502 y separador; no toca números más largos (folios, EAN). */
const PHONE = /(?<![\d+])(?:\+?502[\s-]?)?\d{4}[\s-]?\d{4}(?!\d)/g;

const MAX_DEPTH = 8;

export function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEY.test(key);
}

export function maskText(text: string): string {
  return text.replace(EMAIL, "[correo]").replace(PHONE, "[teléfono]");
}

/** Copia limpia de cualquier valor; los Error se convierten en objeto plano (type, message, stack…). */
export function redact(value: unknown, depth = 0): unknown {
  if (typeof value === "string") return maskText(value);
  if (value === null || typeof value !== "object") return value;
  if (depth >= MAX_DEPTH) return "[…]";
  if (Array.isArray(value)) return value.map((item) => redact(item, depth + 1));

  const source: Record<string, unknown> =
    value instanceof Error
      ? {
          ...value, // propiedades propias (code, meta…); message y stack no son enumerables
          type: value.name,
          message: value.message,
          stack: value.stack,
          ...(value.cause !== undefined ? { cause: value.cause } : {}),
        }
      : (value as Record<string, unknown>);

  const out: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(source))
    out[key] = isSensitiveKey(key) ? CENSOR : redact(item, depth + 1);
  return out;
}
