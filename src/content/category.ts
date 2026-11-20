/**
 * Página de categoría /productos/[categoria] (docs/06 §3.3, docs/17, BD-061). Aparte de catalog.ts:
 * ese lo lleva la isla de filtros al navegador, este solo lo usa el servidor.
 */
export const categoryPage = {
  /** Botones de docs/06 §3.3 («Dónde comprar» es el texto de docs/17). */
  ctas: {
    wholesale: { label: "Cotizar esta línea por mayor", href: "/mayoreo" },
    whereToBuy: { label: "Dónde comprar", href: "/donde-comprar" },
  },
  faqTitle: "Preguntas frecuentes",
  siblingsTitle: "Otras categorías",
} as const;
