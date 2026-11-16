import type { ProductView } from "@/server/data/types";

/** Cierre de la plantilla de descripciones de docs/10 §1. */
const DESCRIPTION_CLOSE =
  "Encuentra dónde comprar o cotiza por mayor con Bolik, hecho en Guatemala.";
/** docs/10 §1: descripciones de hasta 160 caracteres. */
const DESCRIPTION_MAX = 160;
/** Title sin « | Bolik» (la plantilla de rootMetadata lo agrega): 52 + 8 = 60 (docs/10 §1). */
const TITLE_MAX = 52;

/** «Bolígrafo hexagonal…» → «bolígrafo hexagonal…»: va después de una coma. */
const lowerFirst = (text: string) => text.charAt(0).toLocaleLowerCase("es-GT") + text.slice(1);

/** Sin el punto final: la plantilla pone los suyos. */
const sentence = (text: string) => text.trim().replace(/[.\s]+$/, "");

/** Corta en la última palabra que cabe, con «…». */
function cut(text: string, max: number): string {
  if (text.length <= max) return text;
  const head = text.slice(0, max - 1);
  return `${head.slice(0, head.lastIndexOf(" ") > 0 ? head.lastIndexOf(" ") : head.length)}…`;
}

/**
 * Title y description de una ficha (BD-062, docs/10 §1, docs/17 §6): los propios si los tiene
 * (seed o admin); si no, el nombre y la plantilla de docs/10 §1: «{nombre}: {tagline}. {dato
 * clave}. {cierre}». Se usa el primer dato clave con el que cabe en 160 caracteres; si ninguno
 * cabe, va sin dato clave, luego con la descripción corta en lugar del tagline y, al final, la
 * descripción corta recortada. Title de respaldo, plantilla de docs/10 §2: «{nombre}, {tagline o
 * categoría}» si cabe en 52; si no, «{nombre}, {categoría}» o el nombre. El nombre de cada producto
 * es único: ni titles ni descripciones se repiten.
 */
export function productMeta(
  product: Pick<
    ProductView,
    "name" | "tagline" | "shortDescription" | "keyFacts" | "seoTitle" | "seoDescription"
  > & { category: Pick<ProductView["category"], "name"> },
) {
  const { name, tagline, shortDescription, keyFacts } = product;
  const candidates = [
    ...(tagline
      ? [
          ...keyFacts.map(
            (fact) => `${name}: ${sentence(tagline)}. ${sentence(fact)}. ${DESCRIPTION_CLOSE}`,
          ),
          `${name}: ${sentence(tagline)}. ${DESCRIPTION_CLOSE}`,
        ]
      : []),
    `${name}: ${sentence(shortDescription)}. ${DESCRIPTION_CLOSE}`,
  ];
  return {
    title:
      product.seoTitle ??
      [
        ...(tagline ? [`${name}, ${lowerFirst(sentence(tagline))}`] : []),
        `${name}, ${lowerFirst(product.category.name)}`,
      ].find((text) => text.length <= TITLE_MAX) ??
      name,
    description:
      product.seoDescription ??
      candidates.find((text) => text.length <= DESCRIPTION_MAX) ??
      cut(shortDescription, DESCRIPTION_MAX),
  };
}
