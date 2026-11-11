import "server-only";
import type { SeedData } from "../../../../prisma/seed/schema";
import { FAQ_SCOPES } from "@/lib/constants";
import type {
  CategoryView,
  DataSource,
  DepartmentView,
  ProductCardView,
  ProductView,
  SpecGroupView,
  StoreView,
  VariantView,
} from "../types";
import { toSiteSettings } from "../settings-view";
import { seedData } from "./load";

/**
 * Fuente de ejemplo (DATA_SOURCE=fixtures, BD-037): arma los tipos de vista desde
 * prisma/seed/*.json con las mismas reglas que tendrá la de Prisma (BD-032): solo lo publicado,
 * en el orden de los archivos, y las cifras e hitos sin verificar fuera.
 */

type Product = SeedData["products"][number];

const categoryHref = (slug: string) => `/productos/${slug}`;
const productHref = (categorySlug: string, slug: string) => `/productos/${categorySlug}/${slug}`;

/** Productos visibles: publicados y de una categoría publicada. */
function visibleProducts(data: SeedData): Product[] {
  const categories = new Set(data.categories.filter((c) => c.published).map((c) => c.slug));
  return data.products.filter((p) => p.published && categories.has(p.categorySlug));
}

function toVariant(variant: Product["variants"][number]): VariantView {
  return {
    sku: variant.sku,
    barcode: variant.barcode,
    color: { key: variant.colorKey, name: variant.colorName, hex: variant.colorHex },
    isDefault: variant.isDefault,
  };
}

function toCard(data: SeedData, product: Product): ProductCardView {
  const category = data.categories.find((c) => c.slug === product.categorySlug)!;
  const variants = product.variants.filter((v) => v.published);
  return {
    slug: product.slug,
    name: product.name,
    href: productHref(category.slug, product.slug),
    category: { slug: category.slug, name: category.name, lineGroup: category.lineGroup },
    shortDescription: product.shortDescription,
    colors: variants.map((v) => ({ key: v.colorKey, name: v.colorName, hex: v.colorHex })),
    skus: variants.map((v) => v.sku),
    featured: product.featured,
    sample: product.sample,
    image: null, // las fotos llegan con BD-034
  };
}

function toProduct(data: SeedData, product: Product): ProductView {
  const visible = new Map(visibleProducts(data).map((p) => [p.slug, p]));
  const specs: SpecGroupView[] = [];
  for (const spec of product.specs) {
    let group = specs.find((g) => g.name === spec.groupName);
    if (!group) specs.push((group = { name: spec.groupName, items: [] }));
    group.items.push({ label: spec.label, value: spec.value });
  }
  return {
    ...toCard(data, product),
    tagline: product.tagline ?? null,
    description: product.description ?? null,
    keyFacts: product.keyFacts,
    safetyWarning: product.safetyWarning ?? null,
    variants: product.variants.filter((v) => v.published).map(toVariant),
    specs,
    dimensions: product.dimensions.map((d) => ({
      partKey: d.partKey,
      label: d.label,
      valueMm: d.valueMm,
      tolerance: d.tolerance ?? null,
    })),
    packagings: product.packagings.map((p) => ({
      code: p.code,
      name: p.name,
      unitsPerPack: p.unitsPerPack,
      innerPacks: p.innerPacks ?? null,
      lengthMm: p.lengthMm ?? null,
      widthMm: p.widthMm ?? null,
      heightMm: p.heightMm ?? null,
      weightG: p.weightG ?? null,
      isWholesale: p.isWholesale,
    })),
    benefits: product.benefits.map((b) => ({
      iconKey: b.iconKey,
      title: b.title,
      text: b.text ?? null,
    })),
    // En el orden de use-tags.json, igual que la base.
    uses: data.useTags
      .filter((u) => product.uses.includes(u.slug))
      .map((u) => ({ slug: u.slug, name: u.name })),
    related: product.related.flatMap((slug) => {
      const related = visible.get(slug);
      return related ? [toCard(data, related)] : [];
    }),
  };
}

function toCategory(data: SeedData, category: SeedData["categories"][number]): CategoryView {
  return {
    slug: category.slug,
    name: category.name,
    lineGroup: category.lineGroup,
    shortText: category.shortText,
    intro: category.intro ?? null,
    href: categoryHref(category.slug),
    productCount: visibleProducts(data).filter((p) => p.categorySlug === category.slug).length,
  };
}

function toDepartment(data: SeedData, department: SeedData["departments"][number]): DepartmentView {
  return {
    ...department,
    href: `/donde-comprar/${department.slug}`,
    storeCount: data.stores.filter((s) => s.published && s.departmentSlug === department.slug)
      .length,
  };
}

function toStore(data: SeedData, store: SeedData["stores"][number]): StoreView {
  const department = data.departments.find((d) => d.slug === store.departmentSlug)!;
  return {
    slug: store.slug,
    name: store.name,
    type: store.type,
    department: { slug: department.slug, name: department.name },
    municipality: store.municipality ?? null,
    address: store.address ?? null,
    phone: store.phone ?? null,
    websiteUrl: store.websiteUrl ?? null,
    onlineShopUrl: store.onlineShopUrl ?? null,
    lat: store.lat ?? null,
    lng: store.lng ?? null,
    isVerified: store.isVerified,
  };
}

export const fixturesSource: DataSource = {
  async listCategories() {
    const data = seedData();
    return data.categories.filter((c) => c.published).map((c) => toCategory(data, c));
  },

  async getCategory(slug) {
    const data = seedData();
    const category = data.categories.find((c) => c.slug === slug && c.published);
    return category ? toCategory(data, category) : null;
  },

  async listUseTags() {
    return seedData().useTags.map((u) => ({ slug: u.slug, name: u.name }));
  },

  async listProducts(filter = {}) {
    const data = seedData();
    return visibleProducts(data)
      .filter((p) => !filter.categorySlug || p.categorySlug === filter.categorySlug)
      .filter((p) => !filter.useSlug || p.uses.includes(filter.useSlug))
      .map((p) => toCard(data, p));
  },

  async getProduct(categorySlug, slug) {
    const data = seedData();
    const product = visibleProducts(data).find(
      (p) => p.slug === slug && p.categorySlug === categorySlug,
    );
    return product ? toProduct(data, product) : null;
  },

  async getFeaturedProduct() {
    const data = seedData();
    const product = visibleProducts(data).find((p) => p.featured);
    return product ? toProduct(data, product) : null;
  },

  async listVariantMatches() {
    const data = seedData();
    return visibleProducts(data).flatMap((product) => {
      const card = toCard(data, product);
      return product.variants
        .filter((v) => v.published)
        .map((v) => ({ product: card, variant: toVariant(v) }));
    });
  },

  async listDepartments() {
    const data = seedData();
    return data.departments.map((d) => toDepartment(data, d));
  },

  async getDepartment(slug) {
    const data = seedData();
    const department = data.departments.find((d) => d.slug === slug);
    return department ? toDepartment(data, department) : null;
  },

  async listStores(filter = {}) {
    const data = seedData();
    return data.stores
      .filter((s) => s.published)
      .filter((s) => !filter.departmentSlug || s.departmentSlug === filter.departmentSlug)
      .filter((s) => !filter.onlineOnly || Boolean(s.onlineShopUrl))
      .map((s) => toStore(data, s));
  },

  async listFaqs({ scope, categorySlug, productSlug }) {
    return seedData()
      .faqs.filter((f) => f.published && f.scope === scope)
      .filter((f) => !categorySlug || f.categorySlug === categorySlug)
      .filter((f) => !productSlug || f.productSlug === productSlug)
      .map((f) => ({ key: f.key, question: f.question, answer: f.answer }));
  },

  async listPublishedFaqs() {
    const data = seedData();
    const products = new Set(visibleProducts(data).map((p) => p.slug));
    const categories = new Set(data.categories.filter((c) => c.published).map((c) => c.slug));
    return data.faqs
      .map((f, sortOrder) => ({ f, sortOrder }))
      .filter(({ f }) => f.published)
      .filter(({ f }) => !f.productSlug || products.has(f.productSlug))
      .filter(({ f }) => !f.categorySlug || categories.has(f.categorySlug))
      .sort(
        (a, b) =>
          FAQ_SCOPES.indexOf(a.f.scope) - FAQ_SCOPES.indexOf(b.f.scope) ||
          a.sortOrder - b.sortOrder,
      )
      .map(({ f }) => ({ key: f.key, question: f.question, answer: f.answer }));
  },

  async listHeroChapters() {
    return seedData()
      .content.heroChapters.filter((h) => h.published)
      .map((h) => ({
        key: h.key,
        label: h.label,
        hint: h.hint,
        eyebrow: h.eyebrow,
        line: h.line,
        cta:
          h.ctaKind === "quote"
            ? // El esquema exige ctaQuoteType con quote y ctaHref con link.
              { kind: "quote" as const, label: h.ctaLabel, quoteType: h.ctaQuoteType! }
            : { kind: "link" as const, label: h.ctaLabel, href: h.ctaHref! },
        videoDesktop: h.videoDesktop ?? null,
        videoMobile: h.videoMobile ?? null,
        posterKey: h.posterKey ?? null,
      }));
  },

  async listSiteStats() {
    return seedData()
      .content.stats.filter((s) => s.published)
      .map((s) => ({
        key: s.key,
        value: s.value,
        prefix: s.prefix ?? null,
        suffix: s.suffix ?? null,
        label: s.label,
      }));
  },

  async listMilestones() {
    // Solo los verificados se muestran (doc 17): los demás esperan la confirmación de Mercadeo.
    return seedData()
      .content.milestones.filter((m) => m.published && m.isVerified)
      .map((m) => ({ key: m.key, year: m.year, title: m.title, description: m.description }));
  },

  async listSchoolActivities() {
    return seedData()
      .content.activities.filter((a) => a.published)
      .map((a) => ({
        key: a.key,
        title: a.title,
        description: a.description,
        colorKey: a.colorKey,
        iconKey: a.iconKey,
        sample: a.sample,
      }));
  },

  async getSectionAppearance(sectionKey) {
    const look = seedData().content.appearance.find((a) => a.sectionKey === sectionKey);
    return look ? { backgroundPreset: look.backgroundPreset, tone: look.tone } : null;
  },

  async listKits() {
    return seedData()
      .kits.filter((k) => k.published)
      .map((k) => ({
        slug: k.slug,
        name: k.name,
        level: k.level,
        season: k.season,
        description: k.description,
        suggestedPrice: k.priceVisible ? (k.suggestedPrice ?? null) : null,
        items: k.items.map((i) => ({ description: i.description, quantity: i.quantity })),
        sample: k.sample,
      }));
  },

  async getSiteSettings() {
    return toSiteSettings(seedData().settings);
  },

  // Sin fechas: los JSON no dicen cuándo cambió cada cosa y el sitemap no inventa "ahora".
  async listSitemapEntries() {
    const data = seedData();
    const categories = new Set(data.categories.filter((c) => c.published).map((c) => c.slug));
    const withStores = new Set(data.stores.filter((s) => s.published).map((s) => s.departmentSlug));
    return {
      categories: [...categories].map((slug) => ({ slug, updatedAt: null })),
      products: visibleProducts(data).map((p) => ({
        slug: p.slug,
        categorySlug: p.categorySlug,
        updatedAt: null,
        images: [],
      })),
      departments: data.departments
        .filter((d) => withStores.has(d.slug))
        .map((d) => ({ slug: d.slug, updatedAt: null })),
      contentUpdatedAt: null,
    };
  },
};
