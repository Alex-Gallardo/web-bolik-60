import { QUOTE_CONTACT_FIELDS, type QuoteContactField } from "./form-fields";

/**
 * Borrador del formulario de /cotizacion (BD-072, docs/07 §3: «nunca perder lo escrito»). Vive en
 * sessionStorage: sobrevive a recargar y a ir y volver en la misma pestaña, y se borra al cerrarla.
 * Solo textos de los campos del formulario; lo guardado pasa por el mismo filtro al leerse.
 */
export const QUOTE_DRAFT_KEY = "bolik_quote_form";

export type QuoteDraft = Partial<Record<QuoteContactField, string>>;

/** Lo que se puede guardar: solo los campos del formulario y solo textos (recortados a 2,000). */
export function sanitizeDraft(value: unknown): QuoteDraft {
  if (typeof value !== "object" || value === null) return {};
  const draft: QuoteDraft = {};
  for (const field of QUOTE_CONTACT_FIELDS) {
    const raw = (value as Record<string, unknown>)[field];
    if (typeof raw === "string" && raw !== "") draft[field] = raw.slice(0, 2000);
  }
  return draft;
}

export function readDraft(storage: () => Storage = () => window.sessionStorage): QuoteDraft {
  try {
    return sanitizeDraft(JSON.parse(storage().getItem(QUOTE_DRAFT_KEY) ?? "null"));
  } catch {
    return {}; // bloqueado o dañado: el formulario empieza vacío
  }
}

export function saveDraft(draft: QuoteDraft, storage: () => Storage = () => window.sessionStorage) {
  try {
    const clean = sanitizeDraft(draft);
    if (Object.keys(clean).length === 0) storage().removeItem(QUOTE_DRAFT_KEY);
    else storage().setItem(QUOTE_DRAFT_KEY, JSON.stringify(clean));
  } catch {
    // Sin sessionStorage (modo privado estricto) o lleno: el formulario sigue funcionando.
  }
}

export function clearDraft(storage: () => Storage = () => window.sessionStorage) {
  try {
    storage().removeItem(QUOTE_DRAFT_KEY);
  } catch {
    // nada que borrar
  }
}
