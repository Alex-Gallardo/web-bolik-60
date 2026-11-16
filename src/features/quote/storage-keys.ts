/**
 * Clave de localStorage y evento de cambio de la cotización (BD-070), aparte de lines.ts: el
 * contador del header los usa en todas las páginas y no debe arrastrar las listas de constants.ts
 * (presupuesto de JS, docs/12 §2).
 */

/** Clave de localStorage: la que ya leía el contador del header (BD-041). */
export const QUOTE_STORAGE_KEY = "bolik_quote";

/**
 * Evento de la ventana que el store dispara al guardar (misma pestaña; las demás reciben el evento
 * `storage`), con el número de líneas en `detail`: el contador lo escucha sin cargar el store.
 */
export const QUOTE_CHANGE_EVENT = "bolik:quote-change";

/**
 * Evento de la ventana para el «pop» del contador (A-05) cuando el número no sube: agregar algo que
 * ya estaba suma la cantidad a su línea (`merged: true`, BD-062). Lo dispara quien agrega.
 */
export const QUOTE_POP_EVENT = "bolik:quote-pop";

/**
 * Cuántas líneas hay en un valor guardado (JSON de zustand persist); 0 si no se lee. Cuenta las que
 * tienen clave y referencia: el saneo completo (sanitizeLines) lo hace el store al cargar y guarda
 * la lista limpia, así que el número coincide en cuanto el store la lee.
 */
export function countStoredLines(raw: string | null): number {
  if (!raw) return 0;
  try {
    const lines = (JSON.parse(raw) as { state?: { lines?: unknown } })?.state?.lines;
    if (!Array.isArray(lines)) return 0;
    return lines.filter(
      (line) =>
        typeof line === "object" &&
        line !== null &&
        typeof (line as { ref?: unknown }).ref === "string" &&
        typeof (line as { type?: unknown }).type === "string",
    ).length;
  } catch {
    return 0;
  }
}
