import { whatsappMessage } from "@/lib/whatsapp";

/**
 * Valores de ejemplo de la vitrina de feedback (solo /styleguide, noindex). Folios con el formato
 * de docs/05 §4; colores y códigos del Bolik Ultra de docs/17 §2. El mensaje de WhatsApp sigue la
 * plantilla de producto de BD-067 (producto, código, presentación, cantidad y URL).
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
    whatsappMessage({
      context: "product",
      item: { name: product, sku: "PT00058", packaging: "cajilla de 12", quantity: 2 },
      url: "https://www.bolik66.com/productos/boligrafos/bolik-ultra?color=azul",
    }),
} as const;
