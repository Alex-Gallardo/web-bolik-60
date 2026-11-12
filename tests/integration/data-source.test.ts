import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { parseSeedData } from "../../prisma/seed/data";
import { seedDatabase } from "../../prisma/seed/seed";
import { FAQ_SCOPES } from "@/lib/constants";
import { describeDataSourceContract } from "@/server/data/contract";
import { dbSource } from "@/server/data/db/source";
import { fixturesSource } from "@/server/data/fixtures/source";
import { db } from "@/server/db";

// Fuente de SQL Server (BD-032) contra BolikDigital_Test sembrada con el perfil dev: la misma
// batería de contrato que la fuente de ejemplo, más las reglas que solo se pueden romper en la
// base (despublicar, precio de kit, ajustes incompletos). Cada prueba deja la fila como estaba.
const SEED_TIMEOUT = 180_000;

beforeAll(async () => {
  await seedDatabase(db, parseSeedData(), { profile: "dev" });
}, SEED_TIMEOUT);

afterAll(async () => {
  await db.$disconnect();
});

describeDataSourceContract("SQL Server (db)", () => dbSource);

/** Cambia una fila mientras corre `fn` y la deja como estaba. */
async function withChange(
  apply: () => Promise<unknown>,
  restore: () => Promise<unknown>,
  fn: () => Promise<void>,
) {
  await apply();
  try {
    await fn();
  } finally {
    await restore();
  }
}

describe("fuente db: lo mismo que la fuente de ejemplo", () => {
  it("las tarjetas, fichas, tiendas y contenido coinciden con fixtures", async () => {
    expect(await dbSource.listCategories()).toEqual(await fixturesSource.listCategories());
    expect(await dbSource.listProducts()).toEqual(await fixturesSource.listProducts());
    expect(await dbSource.getProduct("boligrafos", "bolik-ultra")).toEqual(
      await fixturesSource.getProduct("boligrafos", "bolik-ultra"),
    );
    expect(await dbSource.listUseTags()).toEqual(await fixturesSource.listUseTags());
    expect(await dbSource.listVariantMatches()).toEqual(await fixturesSource.listVariantMatches());
    expect(await dbSource.listDepartments()).toEqual(await fixturesSource.listDepartments());
    expect(await dbSource.listStores()).toEqual(await fixturesSource.listStores());
    expect(await dbSource.listHeroChapters()).toEqual(await fixturesSource.listHeroChapters());
    expect(await dbSource.listSiteStats()).toEqual(await fixturesSource.listSiteStats());
    expect(await dbSource.listMilestones()).toEqual(await fixturesSource.listMilestones());
    expect(await dbSource.listSchoolActivities()).toEqual(
      await fixturesSource.listSchoolActivities(),
    );
    expect(await dbSource.listKits()).toEqual(await fixturesSource.listKits());
    expect(await dbSource.getSiteSettings()).toEqual(await fixturesSource.getSiteSettings());
    for (const scope of FAQ_SCOPES) {
      expect(await dbSource.listFaqs({ scope })).toEqual(await fixturesSource.listFaqs({ scope }));
    }
    expect(await dbSource.listPublishedFaqs()).toEqual(await fixturesSource.listPublishedFaqs());
    for (const key of ["home.hero", "no.existe"]) {
      expect(await dbSource.getSectionAppearance(key)).toEqual(
        await fixturesSource.getSectionAppearance(key),
      );
    }
  });

  it("los filtros por categoría, uso y departamento coinciden con fixtures", async () => {
    const data = parseSeedData();
    for (const { slug } of data.categories) {
      expect(await dbSource.getCategory(slug)).toEqual(await fixturesSource.getCategory(slug));
      expect(await dbSource.listProducts({ categorySlug: slug })).toEqual(
        await fixturesSource.listProducts({ categorySlug: slug }),
      );
    }
    for (const { slug } of data.useTags) {
      expect(await dbSource.listProducts({ useSlug: slug })).toEqual(
        await fixturesSource.listProducts({ useSlug: slug }),
      );
    }
    for (const { slug } of data.departments) {
      expect(await dbSource.getDepartment(slug)).toEqual(await fixturesSource.getDepartment(slug));
      expect(await dbSource.listStores({ departmentSlug: slug })).toEqual(
        await fixturesSource.listStores({ departmentSlug: slug }),
      );
    }
    expect(await dbSource.listStores({ onlineOnly: true })).toEqual(
      await fixturesSource.listStores({ onlineOnly: true }),
    );
    const slugs = (e: { slug: string }[]) => e.map((x) => x.slug);
    const fromDb = await dbSource.listSitemapEntries();
    const fromFixtures = await fixturesSource.listSitemapEntries();
    expect(slugs(fromDb.categories)).toEqual(slugs(fromFixtures.categories));
    expect(slugs(fromDb.products)).toEqual(slugs(fromFixtures.products));
    expect(slugs(fromDb.departments)).toEqual(slugs(fromFixtures.departments));
  });
});

describe("fuente db: lo despublicado no se ve", () => {
  it("un producto despublicado sale de listas, ficha, índice y relacionados", async () => {
    await withChange(
      () => db.product.update({ where: { slug: "fabik-pizarra" }, data: { published: false } }),
      () => db.product.update({ where: { slug: "fabik-pizarra" }, data: { published: true } }),
      async () => {
        expect((await dbSource.listProducts()).some((p) => p.slug === "fabik-pizarra")).toBe(false);
        const ultra = await dbSource.getProduct("boligrafos", "bolik-ultra");
        expect(ultra!.related.map((p) => p.slug)).not.toContain("fabik-pizarra");
        const index = await dbSource.listVariantMatches();
        expect(index.some((m) => m.product.slug === "fabik-pizarra")).toBe(false);
      },
    );
  });

  it("las FAQs de un producto oculto no llegan a llms", async () => {
    await withChange(
      () => db.product.update({ where: { slug: "bolik-ultra" }, data: { published: false } }),
      () => db.product.update({ where: { slug: "bolik-ultra" }, data: { published: true } }),
      async () => {
        const keys = (await dbSource.listPublishedFaqs()).map((f) => f.key);
        const ultraFaqs = parseSeedData().faqs.filter((f) => f.productSlug === "bolik-ultra");
        expect(ultraFaqs.length).toBeGreaterThan(0);
        for (const faq of ultraFaqs) expect(keys).not.toContain(faq.key);
        expect(keys).toContain("donde-se-fabrican");
      },
    );
  });

  it("una categoría despublicada oculta la categoría y sus productos", async () => {
    await withChange(
      () => db.category.update({ where: { slug: "boligrafos" }, data: { published: false } }),
      () => db.category.update({ where: { slug: "boligrafos" }, data: { published: true } }),
      async () => {
        expect(await dbSource.getCategory("boligrafos")).toBeNull();
        expect(await dbSource.getProduct("boligrafos", "bolik-ultra")).toBeNull();
        expect(await dbSource.getFeaturedProduct()).toBeNull();
        const sitemap = await dbSource.listSitemapEntries();
        expect(sitemap.products.some((p) => p.slug === "bolik-ultra")).toBe(false);
      },
    );
  });

  it("una variante despublicada sale de la ficha y de la búsqueda por código", async () => {
    await withChange(
      () => db.productVariant.update({ where: { sku: "PT00060" }, data: { published: false } }),
      () => db.productVariant.update({ where: { sku: "PT00060" }, data: { published: true } }),
      async () => {
        const ultra = await dbSource.getProduct("boligrafos", "bolik-ultra");
        expect(ultra!.variants.map((v) => v.sku)).toEqual(["PT00058", "PT00059"]);
        const index = await dbSource.listVariantMatches();
        expect(index.some((m) => m.variant.sku === "PT00060")).toBe(false);
      },
    );
  });

  it("el precio de un kit solo se muestra si se aprobó", async () => {
    const slug = parseSeedData().kits[0]!.slug;
    const before = await db.kit.findUniqueOrThrow({ where: { slug } });
    await withChange(
      () =>
        db.kit.update({
          where: { slug },
          data: { published: true, suggestedPrice: 85.5, priceVisible: false },
        }),
      () =>
        db.kit.update({
          where: { slug },
          data: {
            published: before.published,
            suggestedPrice: before.suggestedPrice,
            priceVisible: before.priceVisible,
          },
        }),
      async () => {
        expect((await dbSource.listKits())[0]).toMatchObject({ slug, suggestedPrice: null });
        await db.kit.update({ where: { slug }, data: { priceVisible: true } });
        expect((await dbSource.listKits())[0]).toMatchObject({ slug, suggestedPrice: 85.5 });
      },
    );
  });

  it("un ajuste opcional vacío cuenta como ausente", async () => {
    await withChange(
      () =>
        db.siteSetting.upsert({
          where: { key: "whatsapp_number" },
          create: { key: "whatsapp_number", value: "" },
          update: { value: "" },
        }),
      () => db.siteSetting.deleteMany({ where: { key: "whatsapp_number" } }),
      async () => {
        expect((await dbSource.getSiteSettings()).whatsappNumber).toBeNull();
      },
    );
  });

  it("un ajuste obligatorio que falta da un error claro", async () => {
    const phone = await db.siteSetting.findUniqueOrThrow({ where: { key: "phone" } });
    await withChange(
      () => db.siteSetting.delete({ where: { key: "phone" } }),
      () => db.siteSetting.create({ data: { key: phone.key, value: phone.value } }),
      async () => {
        await expect(dbSource.getSiteSettings()).rejects.toThrow(/SiteSetting.*phone/);
      },
    );
  });
});

describe("fuente db: sitemap", () => {
  it("trae lo publicado con la fecha real de la base", async () => {
    const data = parseSeedData();
    const { categories, products, departments, contentUpdatedAt } =
      await dbSource.listSitemapEntries();
    expect(categories.map((c) => c.slug)).toEqual(data.categories.map((c) => c.slug));
    expect(products.find((p) => p.slug === "bolik-ultra")).toMatchObject({
      categorySlug: "boligrafos",
      images: [],
    });
    // La fecha de la ficha es la más reciente entre el producto y sus variantes.
    const ultra = await db.product.findUniqueOrThrow({
      where: { slug: "bolik-ultra" },
      include: { variants: true },
    });
    const newest = Math.max(
      ultra.updatedAt.getTime(),
      ...ultra.variants.map((v) => v.updatedAt.getTime()),
    );
    expect(products.find((p) => p.slug === "bolik-ultra")!.updatedAt).toBe(
      new Date(newest).toISOString(),
    );
    const boligrafos = categories.find((c) => c.slug === "boligrafos")!;
    expect(boligrafos.updatedAt! >= new Date(newest).toISOString()).toBe(true);
    // Solo departamentos con tiendas publicadas; los demás no tienen página que indexar.
    const withStores = new Set(data.stores.filter((s) => s.published).map((s) => s.departmentSlug));
    expect(departments.map((d) => d.slug).sort()).toEqual([...withStores].sort());
    expect(departments.every((d) => d.updatedAt !== null)).toBe(true);
    expect(contentUpdatedAt).not.toBeNull();
  });
});

// BD-054: lo que guardará el editor de apariencia (BD-121) es lo que lee <Section appearanceKey>.
// En el sitio, el guardado llama a updateTag(TAGS.appearance) y la home se regenera con el fondo.
describe("fuente db: apariencia por sección", () => {
  it("un fondo guardado para una sección de la home se lee tal cual; sin fila, null", async () => {
    expect(await dbSource.getSectionAppearance("home.faq")).toBeNull();
    await withChange(
      () =>
        db.sectionAppearance.create({
          data: { sectionKey: "home.faq", backgroundPreset: "navy", tone: "dark" },
        }),
      () => db.sectionAppearance.delete({ where: { sectionKey: "home.faq" } }),
      async () => {
        expect(await dbSource.getSectionAppearance("home.faq")).toEqual({
          backgroundPreset: "navy",
          tone: "dark",
        });
      },
    );
    expect(await dbSource.getSectionAppearance("home.faq")).toBeNull();
  });
});
