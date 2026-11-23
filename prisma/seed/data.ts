import categories from "./categories.json";
import content from "./content.json";
import departments from "./departments.json";
import faqs from "./faqs.json";
import kits from "./kits.json";
import media from "./media.json";
import products from "./products.json";
import { seedDataSchema, type SeedData } from "./schema";
import settings from "./settings.json";
import stores from "./stores.json";
import useTags from "./use-tags.json";

/**
 * Los JSON de prisma/seed tal cual. Los usan la fuente de ejemplo de la web
 * (src/server/data/fixtures, BD-037) y el seed de la base (BD-031): los dos ven los mismos datos.
 */
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
  media,
};

/** Datos validados con sus valores por defecto; un JSON mal escrito lanza el error de Zod. */
export function parseSeedData(): SeedData {
  return seedDataSchema.parse(rawSeedData);
}
