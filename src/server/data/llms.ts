import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { TAGS } from "@/lib/cache-tags";
import { dataSource } from "./source";
import type { LlmsDataView } from "./types";

/**
 * Lo que resume /llms.txt y /llms-full.txt (BD-100): categorías con sus productos, departamentos
 * con puntos de venta y las FAQs publicadas (en el orden de FAQ_SCOPES, sin las de un producto o
 * categoría oculta). Con los mismos tags que el sitio: cambiar un producto, una tienda o una FAQ
 * actualiza el archivo.
 */
export async function getLlmsData(): Promise<LlmsDataView> {
  "use cache";
  cacheLife("max");
  cacheTag(TAGS.llms, TAGS.products, TAGS.categories, TAGS.stores, TAGS.faqs);
  const source = await dataSource();
  const [categories, products, departments, faqs] = await Promise.all([
    source.listCategories(),
    source.listProducts(),
    source.listDepartments(),
    source.listPublishedFaqs(),
  ]);
  return {
    categories,
    products,
    faqs,
    departmentsWithStores: departments.filter((d) => d.storeCount > 0),
  };
}
