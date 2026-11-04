/**
 * Textos de interfaz que no son feedback (doc 17 §5): etiquetas de estado, botones genéricos.
 * Los toasts y diálogos viven en content/feedback.ts.
 */
export const ui = {
  loading: {
    sending: "Enviando…",
    saving: "Guardando…",
    searching: "Buscando…",
  },
  /** Botones del selector de cantidad (nombre accesible; en pantalla se ven − y +). */
  quantity: {
    decrease: "Quitar uno",
    increase: "Agregar uno",
  },
  /** Prefijo de país del campo de teléfono, para lectores de pantalla. */
  phonePrefix: "Código de país +502, Guatemala",
} as const;
