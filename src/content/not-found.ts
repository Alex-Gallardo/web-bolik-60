/**
 * Textos de la página 404 (docs/17 §404 y 500, BD-046). Aparte de ui.ts a propósito: ui.ts viaja en
 * el JS de cada página (lo importan islas cliente) y estos textos solo los lee un Server Component.
 */
export const notFoundText = {
  /** <title>: la 404 lleva noindex, pero el título nunca sale en inglés. */
  metaTitle: "Página no encontrada",
  title: "Esta página se borró como lápiz.",
  /** Doc 17 dice «Busca un producto…»: vuelve a ese texto cuando BD-066 agregue el buscador aquí. */
  body: "Puede que la dirección haya cambiado. Revisa el catálogo o vuelve al inicio.",
  links: {
    label: "Sigue por aquí",
    home: { label: "Volver al inicio", href: "/" },
    catalog: { label: "Ver el catálogo", href: "/productos" },
    stores: { label: "Dónde comprar", href: "/donde-comprar" },
  },
  categories: "Líneas de producto",
} as const;
