import "server-only";
import { parseSeedData } from "../../../../prisma/seed/data";
import type { SeedData } from "../../../../prisma/seed/schema";

/** Los JSON tal cual, para validarlos en las pruebas sin pasar por el caché. */
export { rawSeedData } from "../../../../prisma/seed/data";

let cached: SeedData | undefined;

/**
 * Datos de ejemplo validados (con sus valores por defecto). Se validan una vez por proceso: un
 * JSON mal escrito rompe el build con el error de Zod, no una página en producción.
 */
export function seedData(): SeedData {
  cached ??= parseSeedData();
  return cached;
}
