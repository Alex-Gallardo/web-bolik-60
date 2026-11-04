import "server-only";
import categories from "../../../../prisma/seed/categories.json";
import content from "../../../../prisma/seed/content.json";
import departments from "../../../../prisma/seed/departments.json";
import faqs from "../../../../prisma/seed/faqs.json";
import kits from "../../../../prisma/seed/kits.json";
import products from "../../../../prisma/seed/products.json";
import { seedDataSchema, type SeedData } from "../../../../prisma/seed/schema";
import settings from "../../../../prisma/seed/settings.json";
import stores from "../../../../prisma/seed/stores.json";
import useTags from "../../../../prisma/seed/use-tags.json";

/** Los JSON tal cual, para validarlos en las pruebas sin pasar por el caché. */
export const rawSeedData = {
  categories,
  useTags,
  products,
  departments,
  stores,
  faqs,
  content,
  kits,
  settings,
};

let cached: SeedData | undefined;

/**
 * Datos de ejemplo validados (con sus valores por defecto). Se validan una vez por proceso: un
 * JSON mal escrito rompe el build con el error de Zod, no una página en producción.
 */
export function seedData(): SeedData {
  cached ??= seedDataSchema.parse(rawSeedData);
  return cached;
}
