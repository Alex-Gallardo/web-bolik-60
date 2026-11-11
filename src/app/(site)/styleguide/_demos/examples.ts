/**
 * Valores de ejemplo de la vitrina de feedback (solo /styleguide, noindex). Folios con el formato
 * de docs/05 §4; colores y códigos del Bolik Ultra de docs/17 §2. El mensaje de WhatsApp sigue la
 * regla de docs/07 (producto, código, presentación y cantidad); el definitivo llega con BD-067.
 */
export const EXAMPLES = {
  quoteFolio: "COT-2027-000123",
  schoolFolio: "ESC-2027-000045",
  distributorFolio: "DIS-2027-000012",
  schoolName: "Colegio Ejemplo",
  searchQuery: "lapicero morado",
  storesFound: 12,
  colors: [
    { name: "Azul", sku: "PT00058" },
    { name: "Negro", sku: "PT00059" },
    { name: "Rojo", sku: "PT00060" },
  ],
  whatsappMessage: (product: string) =>
    `Hola, Bolik. Me interesa ${product} (PT00058), 2 cajillas. ¿Me pueden cotizar?`,
} as const;
