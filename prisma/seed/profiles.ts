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
 * (BolikDigital_Dev, BolikDigital_Test) y nunca con APP_ENV production. La única excepción es
 * staging mientras no llega el catálogo real (BD-016, BD-038): `allowSampleData`
 * (`--allow-sample-data`) permite el perfil dev con APP_ENV=staging en la base BolikDigital_Stg,
 * y solo en ella: el servidor de staging comparte SQL Server con las bases de SMART-K66.
 */
export function seedTargetProblem(
  profile: SeedProfile,
  {
    appEnv,
    databaseName,
    allowSampleData = false,
  }: { appEnv: string; databaseName: string; allowSampleData?: boolean },
): string | null {
  const isStgDatabase = /^BolikDigital_Stg$/i.test(databaseName);
  if (allowSampleData) {
    if (profile === "dev" && appEnv === "staging" && isStgDatabase) return null;
    return `--allow-sample-data solo sirve con --profile dev, APP_ENV=staging y la base BolikDigital_Stg (no ${profile}, ${appEnv} y "${databaseName}").`;
  }
  if (profile === "prod") return null;
  if (appEnv === "staging" || appEnv === "production") {
    const hint =
      appEnv === "staging" && profile === "dev" && isStgDatabase
        ? " (o --profile dev --allow-sample-data para tener ejemplos en staging)"
        : "";
    return `El perfil ${profile} carga datos de ejemplo: en ${appEnv} usa --profile prod${hint}.`;
  }
  if (!/_(dev|test)$/i.test(databaseName)) {
    return `El perfil ${profile} solo siembra bases de desarrollo o de pruebas (…_Dev, …_Test), no "${databaseName}". Para staging o producción usa --profile prod.`;
  }
  return null;
}

/**
 * Los datos que carga un perfil: en prod, sin ejemplos ni relaciones, FAQs o líneas de kit hacia
 * ellos, y sin los pósters y videos de la demo en el hero (BD-050).
 */
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
      heroChapters: data.content.heroChapters.map((h) =>
        h.sampleMedia
          ? {
              ...h,
              posterKey: undefined,
              videoDesktop: undefined,
              videoMobile: undefined,
              sampleMedia: false,
            }
          : h,
      ),
    },
    media: data.media.filter((m) => !m.sample),
    kits: data.kits
      .filter((k) => !k.sample)
      .map((k) => ({
        ...k,
        items: k.items.filter((i) => !i.variantSku || skus.has(i.variantSku)),
      }))
      .filter((k) => k.items.length > 0),
  };
}
