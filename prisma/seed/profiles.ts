import type { SeedData } from "./schema";

/**
 * Perfiles de `pnpm db:seed` (BD-031, docs/05 §6):
 * - dev: base local, con los datos de ejemplo (`sample`), igual que DATA_SOURCE=fixtures.
 * - e2e: lo mismo que dev; las pruebas E2E ven los mismos datos con fixtures y con la base.
 * - prod: staging con base y producción; sin datos de ejemplo ni nada que apunte a ellos.
 */
export const SEED_PROFILES = ["dev", "e2e", "prod"] as const;
export type SeedProfile = (typeof SEED_PROFILES)[number];

/**
 * sync: el JSON manda (actualiza lo que existe y quita las partes que ya no están en el JSON).
 * create-only: solo crea lo que falta y nunca sobrescribe, para no pisar lo editado en el admin.
 */
export type SeedMode = "sync" | "create-only";

export function seedMode(profile: SeedProfile): SeedMode {
  return profile === "prod" ? "create-only" : "sync";
}

export function isSeedProfile(value: string): value is SeedProfile {
  return (SEED_PROFILES as readonly string[]).includes(value);
}

/**
 * Por qué no se debe sembrar con este perfil en esta base, o null si se puede. dev y e2e cargan
 * ejemplos y sincronizan (pisan lo editado): solo van a una base de desarrollo o de pruebas
 * (BolikDigital_Dev, BolikDigital_Test), nunca con APP_ENV staging o production.
 */
export function seedTargetProblem(
  profile: SeedProfile,
  { appEnv, databaseName }: { appEnv: string; databaseName: string },
): string | null {
  if (profile === "prod") return null;
  if (appEnv === "staging" || appEnv === "production") {
    return `El perfil ${profile} carga datos de ejemplo: en ${appEnv} usa --profile prod.`;
  }
  if (!/_(dev|test)$/i.test(databaseName)) {
    return `El perfil ${profile} solo siembra bases de desarrollo o de pruebas (…_Dev, …_Test), no "${databaseName}". Para staging o producción usa --profile prod.`;
  }
  return null;
}

/** Los datos que carga un perfil: en prod, sin ejemplos ni relaciones, FAQs o líneas de kit hacia ellos. */
export function dataForProfile(data: SeedData, profile: SeedProfile): SeedData {
  if (profile !== "prod") return data;

  const products = data.products.filter((p) => !p.sample);
  const productSlugs = new Set(products.map((p) => p.slug));
  const skus = new Set(products.flatMap((p) => p.variants.map((v) => v.sku)));

  return {
    ...data,
    products: products.map((p) => ({
      ...p,
      related: p.related.filter((slug) => productSlugs.has(slug)),
    })),
    faqs: data.faqs.filter((f) => !f.productSlug || productSlugs.has(f.productSlug)),
    content: {
      ...data.content,
      activities: data.content.activities.filter((a) => !a.sample),
    },
    kits: data.kits
      .filter((k) => !k.sample)
      .map((k) => ({
        ...k,
        items: k.items.filter((i) => !i.variantSku || skus.has(i.variantSku)),
      }))
      .filter((k) => k.items.length > 0),
  };
}
