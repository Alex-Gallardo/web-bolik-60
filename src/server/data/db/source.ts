import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { FAQ_SCOPES, MEDIA_IMAGE_KINDS, type PackagingCode } from "@/lib/constants";
import { db } from "@/server/db";
import { toSiteSettings } from "../settings-view";
import type {
  CategoryView,
  DataSource,
  DepartmentView,
  FaqView,
  ImageView,
  KitView,
  LineGroup,
  ProductCardView,
  ProductView,
  SchoolActivityView,
  SectionAppearanceView,
  SpecGroupView,
  StoreView,
  VariantView,
} from "../types";

/**
 * Fuente de SQL Server (DATA_SOURCE=db, BD-032): las mismas reglas que la fuente de ejemplo
 * (src/server/data/fixtures/source.ts) y la misma batería de contrato. Solo lo publicado, en el
 * orden de sortOrder; un producto se ve si su categoría también está publicada; los hitos sin
 * verificar y los precios de kit no aprobados quedan fuera. Devuelve tipos de vista, nunca
 * modelos de Prisma. La llaman solo las funciones cacheadas de src/server/data/*.ts.
 */

const categoryHref = (slug: string) => `/productos/${slug}`;
const productHref = (categorySlug: string, slug: string) => `/productos/${categorySlug}/${slug}`;

/** Decimal de SQL Server (Prisma.Decimal) a número; null se queda null. */
const num = (value: Prisma.Decimal | null): number | null =>
  value === null ? null : Number(value);

const bySortOrder: [{ sortOrder: "asc" }, { id: "asc" }] = [{ sortOrder: "asc" }, { id: "asc" }];

/** Productos visibles: publicados y de una categoría publicada. */
const visibleProduct = { published: true, category: { published: true } } as const;

const cardInclude = {
  category: { select: { slug: true, name: true, lineGroup: true } },
  variants: { where: { published: true }, orderBy: bySortOrder },
} satisfies Prisma.ProductInclude;

type CardRow = Prisma.ProductGetPayload<{ include: typeof cardInclude }>;

function toVariant(v: CardRow["variants"][number]): VariantView {
  return {
    sku: v.sku,
    barcode: v.barcode,
    color: { key: v.colorKey, name: v.colorName, hex: v.colorHex },
    isDefault: v.isDefault,
  };
}

function toCard(p: CardRow): ProductCardView {
  return {
    slug: p.slug,
    name: p.name,
    href: productHref(p.category.slug, p.slug),
    category: {
      slug: p.category.slug,
      name: p.category.name,
      lineGroup: p.category.lineGroup as LineGroup,
    },
    shortDescription: p.shortDescription,
    colors: p.variants.map((v) => ({ key: v.colorKey, name: v.colorName, hex: v.colorHex })),
    skus: p.variants.map((v) => v.sku),
    featured: p.featured,
    sample: p.isSample,
    image: null, // las fotos llegan con BD-034
  };
}

/** keyFacts se guarda como JSON; un valor dañado no tumba la ficha. */
function parseKeyFacts(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((f): f is string => typeof f === "string") : [];
  } catch {
    return [];
  }
}

const productInclude = {
  ...cardInclude,
  specs: { orderBy: bySortOrder },
  dimensions: { orderBy: bySortOrder },
  packagings: { orderBy: bySortOrder },
  benefits: { orderBy: bySortOrder },
  uses: { include: { useTag: true }, orderBy: { useTag: { id: "asc" } } },
  relatedFrom: {
    where: { to: visibleProduct },
    orderBy: { sortOrder: "asc" },
    include: { to: { include: cardInclude } },
  },
} satisfies Prisma.ProductInclude;

type ProductRow = Prisma.ProductGetPayload<{ include: typeof productInclude }>;

function toProduct(p: ProductRow): ProductView {
  const specs: SpecGroupView[] = [];
  for (const spec of p.specs) {
    let group = specs.find((g) => g.name === spec.groupName);
    if (!group) specs.push((group = { name: spec.groupName, items: [] }));
    group.items.push({ label: spec.label, value: spec.value });
  }
  return {
    ...toCard(p),
    tagline: p.tagline,
    description: p.description,
    keyFacts: parseKeyFacts(p.keyFacts),
    safetyWarning: p.safetyWarning,
    variants: p.variants.map(toVariant),
    specs,
    dimensions: p.dimensions.map((d) => ({
      partKey: d.partKey,
      label: d.label,
      valueMm: Number(d.valueMm),
      tolerance: d.tolerance,
    })),
    packagings: p.packagings.map((k) => ({
      code: k.code as PackagingCode,
      name: k.name,
      unitsPerPack: k.unitsPerPack,
      innerPacks: k.innerPacks,
      lengthMm: num(k.lengthMm),
      widthMm: num(k.widthMm),
      heightMm: num(k.heightMm),
      weightG: num(k.weightG),
      isWholesale: k.isWholesale,
    })),
    benefits: p.benefits.map((b) => ({ iconKey: b.iconKey, title: b.title, text: b.text })),
    uses: p.uses.map((u) => ({ slug: u.useTag.slug, name: u.useTag.name })),
    related: p.relatedFrom.map((r) => toCard(r.to)),
  };
}

/** productCount: productos visibles (publicados) de la categoría, contados en la misma consulta. */
const categorySelect = {
  slug: true,
  name: true,
  lineGroup: true,
  shortText: true,
  intro: true,
  _count: { select: { products: { where: { published: true } } } },
} satisfies Prisma.CategorySelect;

function toCategory(c: Prisma.CategoryGetPayload<{ select: typeof categorySelect }>): CategoryView {
  return {
    slug: c.slug,
    name: c.name,
    lineGroup: c.lineGroup as LineGroup,
    shortText: c.shortText,
    intro: c.intro,
    href: categoryHref(c.slug),
    productCount: c._count.products,
  };
}

const departmentSelect = {
  slug: true,
  name: true,
  country: true,
  lat: true,
  lng: true,
  _count: { select: { stores: { where: { published: true } } } },
} satisfies Prisma.DepartmentSelect;

function toDepartment(
  d: Prisma.DepartmentGetPayload<{ select: typeof departmentSelect }>,
): DepartmentView {
  return {
    slug: d.slug,
    name: d.name,
    country: d.country as DepartmentView["country"],
    lat: Number(d.lat),
    lng: Number(d.lng),
    href: `/donde-comprar/${d.slug}`,
    storeCount: d._count.stores,
  };
}

/**
 * Guatemala primero y El Salvador al final, cada uno por slug: el orden de departments.json. Se
 * ordena en JS (comparación de códigos) y no en SQL, cuya intercalación Modern_Spanish_CI_AS trata
 * distinto los guiones.
 */
function sortDepartments<T extends { country: string; slug: string }>(rows: T[]): T[] {
  const key = (d: T) => `${d.country === "GT" ? 0 : 1}|${d.slug}`;
  return [...rows].sort((a, b) => (key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0));
}

const maxDate = (dates: (Date | null | undefined)[]): string | null => {
  const times = dates.filter((d): d is Date => d instanceof Date).map((d) => d.getTime());
  return times.length > 0 ? new Date(Math.max(...times)).toISOString() : null;
};

export const dbSource: DataSource = {
  async listCategories() {
    const rows = await db.category.findMany({
      where: { published: true },
      select: categorySelect,
      orderBy: bySortOrder,
    });
    return rows.map(toCategory);
  },

  async getCategory(slug) {
    const row = await db.category.findFirst({
      where: { slug, published: true },
      select: categorySelect,
    });
    return row ? toCategory(row) : null;
  },

  async listUseTags() {
    const rows = await db.useTag.findMany({ orderBy: { id: "asc" } });
    return rows.map((u) => ({ slug: u.slug, name: u.name }));
  },

  async listProducts(filter = {}) {
    const rows = await db.product.findMany({
      where: {
        ...visibleProduct,
        ...(filter.categorySlug && {
          category: { published: true, slug: filter.categorySlug },
        }),
        ...(filter.useSlug && { uses: { some: { useTag: { slug: filter.useSlug } } } }),
      },
      include: cardInclude,
      orderBy: bySortOrder,
    });
    return rows.map(toCard);
  },

  async getProduct(categorySlug, slug) {
    const row = await db.product.findFirst({
      where: { slug, published: true, category: { published: true, slug: categorySlug } },
      include: productInclude,
    });
    return row ? toProduct(row) : null;
  },

  async getFeaturedProduct() {
    const row = await db.product.findFirst({
      where: { ...visibleProduct, featured: true },
      include: productInclude,
      orderBy: bySortOrder,
    });
    return row ? toProduct(row) : null;
  },

  async listVariantMatches() {
    const rows = await db.product.findMany({
      where: visibleProduct,
      include: cardInclude,
      orderBy: bySortOrder,
    });
    return rows.flatMap((p) => {
      const card = toCard(p);
      return p.variants.map((v) => ({ product: card, variant: toVariant(v) }));
    });
  },

  async listDepartments() {
    const rows = await db.department.findMany({ select: departmentSelect });
    return sortDepartments(rows).map(toDepartment);
  },

  async getDepartment(slug) {
    const row = await db.department.findUnique({ where: { slug }, select: departmentSelect });
    return row ? toDepartment(row) : null;
  },

  async listStores(filter = {}) {
    const rows = await db.store.findMany({
      where: {
        published: true,
        ...(filter.departmentSlug && { department: { slug: filter.departmentSlug } }),
        ...(filter.onlineOnly && { onlineShopUrl: { not: null } }),
      },
      include: { department: { select: { slug: true, name: true } } },
      orderBy: bySortOrder,
    });
    return rows.map((s): StoreView => ({
      slug: s.slug,
      name: s.name,
      type: s.type as StoreView["type"],
      department: s.department,
      municipality: s.municipality,
      address: s.address,
      phone: s.phone,
      websiteUrl: s.websiteUrl,
      onlineShopUrl: s.onlineShopUrl,
      lat: num(s.lat),
      lng: num(s.lng),
      isVerified: s.isVerified,
    }));
  },

  async listFaqs({ scope, categorySlug, productSlug }) {
    const rows = await db.faq.findMany({
      where: {
        published: true,
        scope,
        ...(categorySlug && { category: { slug: categorySlug } }),
        ...(productSlug && { product: { slug: productSlug } }),
      },
      orderBy: bySortOrder,
    });
    return rows.map((f): FaqView => ({ key: f.key, question: f.question, answer: f.answer }));
  },

  async listPublishedFaqs() {
    const rows = await db.faq.findMany({
      where: {
        published: true,
        AND: [
          { OR: [{ productId: null }, { product: visibleProduct }] },
          { OR: [{ categoryId: null }, { category: { published: true } }] },
        ],
      },
      orderBy: bySortOrder,
    });
    return rows
      .sort(
        (a, b) =>
          FAQ_SCOPES.indexOf(a.scope as (typeof FAQ_SCOPES)[number]) -
          FAQ_SCOPES.indexOf(b.scope as (typeof FAQ_SCOPES)[number]),
      )
      .map((f): FaqView => ({ key: f.key, question: f.question, answer: f.answer }));
  },

  async listHeroChapters() {
    const rows = await db.heroChapter.findMany({
      where: { published: true },
      orderBy: bySortOrder,
    });
    // posterKey no es una relación: se busca en MediaAsset y, si no está, el capítulo va sin póster.
    const keys = rows.flatMap((h) => (h.posterKey ? [h.posterKey] : []));
    const assets = keys.length
      ? await db.mediaAsset.findMany({
          where: { key: { in: keys }, kind: { in: [...MEDIA_IMAGE_KINDS] } },
        })
      : [];
    const posters = new Map(
      assets.flatMap((m): [string, ImageView][] =>
        m.width && m.height
          ? [
              [
                m.key,
                {
                  src: `/media/${m.key}`,
                  alt: m.defaultAlt ?? "",
                  width: m.width,
                  height: m.height,
                  blurDataUrl: m.blurDataUrl,
                },
              ],
            ]
          : [],
      ),
    );
    return rows.map((h) => ({
      key: h.key,
      label: h.label,
      hint: h.hint,
      eyebrow: h.eyebrow,
      line: h.line,
      cta:
        h.ctaKind === "quote"
          ? {
              kind: "quote" as const,
              label: h.ctaLabel,
              quoteType: (h.ctaQuoteType === "empresa" ? "empresa" : "libreria") as
                "empresa" | "libreria",
            }
          : { kind: "link" as const, label: h.ctaLabel, href: h.ctaHref ?? "/" },
      secondaryCta:
        h.secondaryCtaLabel && h.secondaryCtaHref
          ? { label: h.secondaryCtaLabel, href: h.secondaryCtaHref }
          : null,
      videoDesktop: h.videoDesktop,
      videoMobile: h.videoMobile,
      poster: (h.posterKey && posters.get(h.posterKey)) || null,
    }));
  },

  async listSiteStats() {
    const rows = await db.siteStat.findMany({ where: { published: true }, orderBy: bySortOrder });
    return rows.map((s) => ({
      key: s.key,
      value: s.value,
      prefix: s.prefix,
      suffix: s.suffix,
      label: s.label,
    }));
  },

  async listMilestones() {
    // Solo los verificados se muestran (doc 17): los demás esperan la confirmación de Mercadeo.
    const rows = await db.historyMilestone.findMany({
      where: { published: true, isVerified: true },
      orderBy: bySortOrder,
    });
    return rows.map((m) => ({
      key: m.key,
      year: m.year,
      title: m.title,
      description: m.description,
    }));
  },

  async listSchoolActivities() {
    const rows = await db.schoolActivity.findMany({
      where: { published: true },
      orderBy: bySortOrder,
    });
    return rows.map((a): SchoolActivityView => ({
      key: a.key,
      title: a.title,
      description: a.description,
      colorKey: a.colorKey as SchoolActivityView["colorKey"],
      iconKey: a.iconKey,
      sample: a.isSample,
    }));
  },

  async getSectionAppearance(sectionKey) {
    const row = await db.sectionAppearance.findUnique({ where: { sectionKey } });
    return row
      ? {
          backgroundPreset: row.backgroundPreset as SectionAppearanceView["backgroundPreset"],
          tone: row.tone === "dark" ? "dark" : "light",
        }
      : null;
  },

  async listKits() {
    const rows = await db.kit.findMany({
      where: { published: true },
      include: { items: { orderBy: bySortOrder } },
      orderBy: bySortOrder,
    });
    return rows.map((k): KitView => ({
      slug: k.slug,
      name: k.name,
      level: k.level as KitView["level"],
      season: k.season,
      description: k.description,
      suggestedPrice: k.priceVisible ? num(k.suggestedPrice) : null,
      items: k.items.map((i) => ({ description: i.description, quantity: i.quantity })),
      sample: k.isSample,
    }));
  },

  async getSiteSettings() {
    const rows = await db.siteSetting.findMany();
    return toSiteSettings(Object.fromEntries(rows.map((r) => [r.key, r.value])));
  },

  async listSitemapEntries() {
    const [categories, products, departments, settings, appearance, faqs] = await Promise.all([
      db.category.findMany({
        where: { published: true },
        select: { slug: true, updatedAt: true },
        orderBy: bySortOrder,
      }),
      // La fecha de una ficha también cambia con sus variantes (sincronización con SAP).
      db.product.findMany({
        where: visibleProduct,
        select: {
          slug: true,
          updatedAt: true,
          category: { select: { slug: true } },
          variants: {
            where: { published: true },
            select: { updatedAt: true },
            orderBy: { updatedAt: "desc" },
            take: 1,
          },
        },
        orderBy: bySortOrder,
      }),
      db.department.findMany({
        where: { stores: { some: { published: true } } },
        select: {
          slug: true,
          country: true,
          stores: {
            where: { published: true },
            select: { updatedAt: true },
            orderBy: { updatedAt: "desc" },
            take: 1,
          },
        },
      }),
      db.siteSetting.aggregate({ _max: { updatedAt: true } }),
      db.sectionAppearance.aggregate({ _max: { updatedAt: true } }),
      // Sin filtrar publicadas: despublicar una FAQ también cambia la página.
      db.faq.aggregate({ _max: { updatedAt: true } }),
    ]);
    const productEntries = products.map((p) => ({
      slug: p.slug,
      categorySlug: p.category.slug,
      updatedAt: maxDate([p.updatedAt, ...p.variants.map((v) => v.updatedAt)]),
      images: [], // las fotos llegan con BD-034
    }));
    return {
      // Una categoría cambia con ella misma y con cualquiera de sus productos.
      categories: categories.map((c) => ({
        slug: c.slug,
        updatedAt: maxDate([
          c.updatedAt,
          ...productEntries
            .filter((p) => p.categorySlug === c.slug && p.updatedAt)
            .map((p) => new Date(p.updatedAt!)),
        ]),
      })),
      products: productEntries,
      departments: sortDepartments(departments).map((d) => ({
        slug: d.slug,
        updatedAt: maxDate(d.stores.map((s) => s.updatedAt)),
      })),
      contentUpdatedAt: maxDate([
        settings._max.updatedAt,
        appearance._max.updatedAt,
        faqs._max.updatedAt,
      ]),
    };
  },
};
