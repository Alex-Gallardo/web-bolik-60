/**
 * Textos de las imágenes Open Graph (BD-090, docs/10 §3): la vista previa de un enlace compartido
 * en WhatsApp, Facebook o LinkedIn. Lema y cierre de doc 17 §1 y §6.
 */
export const ogText = {
  /** Imagen por defecto (home y páginas sin una propia). */
  defaultTitle: "Útiles escolares y de oficina",
  defaultSubtitle: "Fabricados en Guatemala desde 1966.",
  /** doc 17 §6. */
  defaultAlt: "Bolik, útiles escolares y de oficina hechos en Guatemala",
  /** Pie de todas: el dominio y la frase de marca. */
  footer: "Hecho en Guatemala desde 1966",
  /** Encima del nombre en la de una categoría. */
  categoryEyebrow: "Catálogo Bolik",
  productAlt: (name: string, category: string) => `${name}, ${category} Bolik`,
  categoryAlt: (name: string) => `${name} Bolik: catálogo de productos`,
} as const;
