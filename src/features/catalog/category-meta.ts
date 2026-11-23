import type { CategoryView } from "@/server/data/types";

/** Cierre de la plantilla de descripciones de docs/10 §1. */
const DESCRIPTION_CLOSE =
  "Encuentra dónde comprar o cotiza por mayor con Bolik, hecho en Guatemala.";
/** docs/10 §1: descripciones de 140–160 caracteres. */
const DESCRIPTION_MAX = 160;

/**
 * Title y description de la página de una categoría (BD-061, docs/10 §1, docs/17 §6): los propios
 * si los tiene (seed o admin); si no, el nombre y una descripción armada con la plantilla de
 * docs/10 §1: «{nombre} Bolik: {texto corto} {cierre}», sin el nombre si pasa de 160 caracteres.
 * Cada categoría tiene nombre y texto corto propios, así que nunca se repiten.
 */
export function categoryMeta(
  category: Pick<CategoryView, "name" | "shortText" | "seoTitle" | "seoDescription">,
) {
  const withName = `${category.name} Bolik: ${category.shortText} ${DESCRIPTION_CLOSE}`;
  return {
    title: category.seoTitle ?? category.name,
    description:
      category.seoDescription ??
      (withName.length <= DESCRIPTION_MAX
        ? withName
        : `${category.shortText} ${DESCRIPTION_CLOSE}`),
  };
}
