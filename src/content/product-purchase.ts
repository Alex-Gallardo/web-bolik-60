/**
 * Textos de la isla de compra de la ficha (docs/17 §3, BD-062). Aparte de product.ts: este va al
 * navegador, así que solo lleva lo que la isla usa (presupuesto de JS, docs/12 §2).
 */
export const purchaseText = {
  colorLegend: "Color",
  packLegend: "Presentación",
  /** Sin presentaciones, la cantidad va en unidades. */
  unitsQuestion: "¿Cuántas unidades necesitas?",
  /** Sin presentación, la cotización cuenta unidades. */
  unit: (n: number) => (n === 1 ? "unidad" : "unidades"),
  /** «Total: 240 unidades». */
  total: (units: number) =>
    `Total: ${units.toLocaleString("es-GT")} ${units === 1 ? "unidad" : "unidades"}`,
  /** Valores sugeridos del stepper (docs/07 §3): «Elegir 20». */
  suggestedLabel: "Cantidades sugeridas",
  suggested: (n: number) => `Elegir ${n}`,
  add: "Agregar a mi cotización",
  addShort: "Agregar a cotización",
  whatsapp: "Preguntar por WhatsApp",
  whatsappShort: "WhatsApp",
  newTab: "(se abre en otra pestaña)",
  /** Nombre de la barra fija de abajo en móvil. */
  barLabel: "Acciones del producto",
} as const;
