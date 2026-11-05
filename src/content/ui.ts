/**
 * Textos de interfaz que no son feedback (doc 17 §5): etiquetas de estado, botones genéricos.
 * Los toasts y diálogos viven en content/feedback.ts.
 */
/** Una sola instancia: «azul, rojo y negro». */
const LIST = new Intl.ListFormat("es-GT", { type: "conjunction" });

export const ui = {
  loading: {
    sending: "Enviando…",
    saving: "Guardando…",
    searching: "Buscando…",
    products: "Cargando productos…",
  },
  /** Botones del selector de cantidad (nombre accesible; en pantalla se ven − y +). */
  quantity: {
    decrease: "Quitar uno",
    increase: "Agregar uno",
  },
  /** Tarjetas del catálogo y de tiendas (doc 17 §3 y §4). */
  cards: {
    viewProduct: "Ver producto",
    products: (n: number) => `${n.toLocaleString("es-GT")} ${n === 1 ? "producto" : "productos"}`,
    colors: (names: string[]) =>
      `${names.length === 1 ? "Color" : "Colores"}: ${LIST.format(names.map((n) => n.toLowerCase()))}`,
    /** Puntos de color que no caben en la tarjeta: «+3». */
    moreColors: (n: number) => `+${n}`,
    directions: "Cómo llegar",
    call: "Llamar",
    buyOnline: "Comprar en línea",
    /** Contexto solo para lectores de pantalla: «Cómo llegar a Tulán», «Comprar en línea en Tulán». */
    toStore: (name: string) => `a ${name}`,
    inStore: (name: string) => `en ${name}`,
    newTab: "(se abre en otra pestaña)",
    unverified: "Datos por confirmar",
    storeTypes: { cadena: "Cadena", libreria: "Librería", distribuidor: "Distribuidor" },
  },
  /** Prefijo de país del campo de teléfono, para lectores de pantalla. */
  phonePrefix: "Código de país +502, Guatemala",
} as const;
