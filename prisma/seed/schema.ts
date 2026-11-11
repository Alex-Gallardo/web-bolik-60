import { z } from "zod";
import {
  BACKGROUND_PRESETS,
  FAQ_SCOPES,
  LINE_GROUPS,
  PACKAGING_CODES,
  STORE_TYPES,
} from "../../src/lib/constants";
import { isValidGtin } from "../../src/lib/gtin";

/**
 * Formato de los datos de prisma/seed/*.json (BD-037). Los lee la fuente de ejemplo de la web
 * (src/server/data/fixtures) y los carga en SQL Server el seed (BD-031). Las claves naturales
 * (slug, sku, key) son las que usa el seed para no duplicar; el orden del arreglo es el sortOrder.
 * `sample: true` marca datos de ejemplo que no existen en el catálogo real: nunca van a producción.
 * Sin "server-only": también lo importa el seed, que corre fuera de Next.
 */

const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug en minúsculas con guiones");
const key = z.string().regex(/^[a-z0-9]+(?:[-_][a-z0-9]+)*$/);
const hex = z.string().regex(/^#[0-9A-F]{6}$/, "color #RRGGBB en mayúsculas");
const mm = z.number().positive();
const text = (max: number) => z.string().trim().min(1).max(max);
// Terminan como href públicos: solo https.
const httpsUrl = z.url({ protocol: /^https$/ });
// Ruta del propio sitio: "/productos", nunca "//otro-dominio.com".
const internalPath = z.string().regex(/^\/(?!\/)/, "ruta interna que empieza con una sola /");
const lat = z.number().min(-90).max(90);
const lng = z.number().min(-180).max(180);
/** Dato de ejemplo (de la demo, sin validar): se ve con DATA_SOURCE=fixtures, nunca va a producción. */
const sample = z.boolean().default(false);

export const categorySchema = z.object({
  slug,
  name: text(120),
  lineGroup: z.enum(LINE_GROUPS),
  shortText: text(200),
  intro: z.string().trim().min(1).optional(),
  published: z.boolean().default(true),
});

export const useTagSchema = z.object({ slug, name: text(60) });

export const variantSchema = z.object({
  sku: z.string().regex(/^[A-Z0-9-]{3,30}$/),
  barcode: z
    .string()
    .refine(isValidGtin, "código de barras con dígito verificador inválido")
    .nullable(), // null = por confirmar (no se inventa)
  colorKey: key,
  colorName: text(40),
  colorHex: hex,
  isDefault: z.boolean().default(false),
  published: z.boolean().default(true),
});

export const productSchema = z.object({
  slug,
  name: text(120),
  categorySlug: slug,
  sample,
  tagline: text(160).optional(),
  shortDescription: text(300),
  description: z.string().trim().min(1).optional(),
  keyFacts: z.array(text(200)).default([]),
  safetyWarning: z.string().trim().min(1).optional(),
  featured: z.boolean().default(false),
  published: z.boolean().default(false),
  uses: z.array(slug).default([]),
  related: z.array(slug).default([]),
  variants: z.array(variantSchema).min(1),
  specs: z.array(z.object({ groupName: text(60), label: text(80), value: text(300) })).default([]),
  dimensions: z
    .array(z.object({ partKey: key, label: text(80), valueMm: mm, tolerance: text(20).optional() }))
    .default([]),
  packagings: z
    .array(
      z.object({
        code: z.enum(PACKAGING_CODES),
        name: text(80),
        unitsPerPack: z.number().int().positive(),
        innerPacks: z.number().int().positive().optional(),
        lengthMm: mm.optional(),
        widthMm: mm.optional(),
        heightMm: mm.optional(),
        weightG: mm.optional(),
        isWholesale: z.boolean().default(false),
      }),
    )
    .default([]),
  benefits: z
    .array(z.object({ iconKey: key, title: text(80), text: text(200).optional() }))
    .default([]),
});

export const departmentSchema = z.object({
  slug,
  name: text(60),
  country: z.enum(["GT", "SV"]),
  lat,
  lng,
});

export const storeSchema = z
  .object({
    slug,
    name: text(120),
    type: z.enum(STORE_TYPES),
    departmentSlug: slug,
    municipality: text(80).optional(),
    address: text(250).optional(),
    phone: text(30).optional(),
    websiteUrl: httpsUrl.optional(),
    onlineShopUrl: httpsUrl.optional(),
    lat: lat.optional(),
    lng: lng.optional(),
    isVerified: z.boolean().default(false), // dirección validada por Ventas
    published: z.boolean().default(true),
  })
  .refine((s) => (s.lat === undefined) === (s.lng === undefined), "lat y lng van juntas");

export const faqSchema = z
  .object({
    key,
    scope: z.enum(FAQ_SCOPES),
    categorySlug: slug.optional(),
    productSlug: slug.optional(),
    question: text(200),
    answer: z.string().trim().min(1),
    published: z.boolean().default(true),
  })
  .refine((f) => f.scope !== "product" || f.productSlug, "scope product requiere productSlug")
  .refine((f) => f.scope !== "category" || f.categorySlug, "scope category requiere categorySlug");

export const contentSchema = z.object({
  heroChapters: z.array(
    z
      .object({
        key,
        label: text(40),
        hint: text(60),
        eyebrow: text(80),
        line: text(220),
        ctaLabel: text(40),
        ctaKind: z.enum(["link", "quote"]),
        ctaHref: internalPath.optional(),
        ctaQuoteType: z.enum(["empresa", "libreria"]).optional(),
        videoDesktop: internalPath.optional(),
        videoMobile: internalPath.optional(),
        posterKey: z.string().optional(),
        published: z.boolean().default(true),
      })
      .refine((h) => h.ctaKind !== "link" || h.ctaHref, "un CTA link requiere ctaHref")
      .refine((h) => h.ctaKind !== "quote" || h.ctaQuoteType, "un CTA quote requiere ctaQuoteType"),
  ),
  stats: z.array(
    z.object({
      key,
      value: z.number().int().nonnegative(),
      prefix: z.string().max(5).optional(),
      suffix: z.string().max(5).optional(),
      label: text(80),
      sourceNote: text(200).optional(),
      published: z.boolean().default(true),
    }),
  ),
  milestones: z.array(
    z.object({
      key,
      year: z.number().int().min(1966).max(2100),
      title: text(120),
      description: text(400),
      isVerified: z.boolean().default(false),
      published: z.boolean().default(true),
    }),
  ),
  activities: z.array(
    z.object({
      key,
      title: text(120),
      description: text(400),
      colorKey: z.enum(["coral", "kblue", "kgreen", "paper"]),
      iconKey: key,
      sample,
      published: z.boolean().default(true),
    }),
  ),
  appearance: z.array(
    z.object({
      sectionKey: z.string().regex(/^[a-z]+(\.[a-z-]+)+$/),
      backgroundPreset: z.enum(BACKGROUND_PRESETS),
      tone: z.enum(["light", "dark"]),
    }),
  ),
});

export const kitSchema = z.object({
  slug,
  name: text(120),
  sample,
  level: z.enum(["preprimaria", "primaria", "basicos", "diversificado"]),
  season: z.number().int().min(2026),
  description: text(400),
  suggestedPrice: z.number().positive().optional(),
  priceVisible: z.boolean().default(false),
  published: z.boolean().default(false),
  items: z
    .array(
      z.object({
        description: text(120),
        quantity: z.number().int().positive(),
        variantSku: z.string().optional(),
      }),
    )
    .min(1),
});

/** Claves de SiteSetting que conoce la web; el valor siempre es texto (como en la tabla). */
export const settingsSchema = z
  .object({
    phone: text(30),
    address: text(200),
    business_hours: text(120),
    legal_name: text(120),
    whatsapp_number: z
      .string()
      .regex(/^\d{8,15}$/)
      .optional(), // sin inventar: vacío hasta tenerlo
    splash_enabled: z.enum(["true", "false"]),
    kits_enabled: z.enum(["true", "false"]),
    show_kit_prices: z.enum(["true", "false"]).optional(),
    erp_enabled: z.enum(["true", "false"]).optional(),
    min_custom_order: z.string().regex(/^\d+$/).optional(),
    quote_email_to: z.email().optional(),
    social_facebook: httpsUrl.optional(),
  })
  .strict(); // una clave mal escrita falla aquí y no queda ignorada

export const seedDataSchema = z
  .object({
    categories: z.array(categorySchema),
    useTags: z.array(useTagSchema),
    products: z.array(productSchema),
    departments: z.array(departmentSchema),
    stores: z.array(storeSchema),
    faqs: z.array(faqSchema),
    content: contentSchema,
    kits: z.array(kitSchema),
    settings: settingsSchema,
  })
  .superRefine((data, ctx) => {
    const fail = (path: (string | number)[], message: string) =>
      ctx.addIssue({ code: "custom", path, message });
    const unique = (name: string, values: string[]) => {
      const seen = new Set<string>();
      values.forEach((value, index) => {
        if (seen.has(value)) fail([name, index], `${value} repetido`);
        seen.add(value);
      });
    };

    unique(
      "categories",
      data.categories.map((c) => c.slug),
    );
    unique(
      "useTags",
      data.useTags.map((u) => u.slug),
    );
    unique(
      "products",
      data.products.map((p) => p.slug),
    );
    unique(
      "variants",
      data.products.flatMap((p) => p.variants.map((v) => v.sku)),
    );
    unique(
      "departments",
      data.departments.map((d) => d.slug),
    );
    unique(
      "stores",
      data.stores.map((s) => s.slug),
    );
    unique(
      "faqs",
      data.faqs.map((f) => f.key),
    );
    unique(
      "kits",
      data.kits.map((k) => k.slug),
    );
    unique(
      "milestones",
      data.content.milestones.map((m) => m.key),
    );
    unique(
      "activities",
      data.content.activities.map((a) => a.key),
    );
    unique(
      "heroChapters",
      data.content.heroChapters.map((h) => h.key),
    );
    unique(
      "stats",
      data.content.stats.map((s) => s.key),
    );

    const categories = new Set(data.categories.map((c) => c.slug));
    const uses = new Set(data.useTags.map((u) => u.slug));
    const products = new Set(data.products.map((p) => p.slug));
    const departments = new Set(data.departments.map((d) => d.slug));
    const skus = new Set(data.products.flatMap((p) => p.variants.map((v) => v.sku)));

    data.products.forEach((p, i) => {
      if (!categories.has(p.categorySlug))
        fail(["products", i], `categoría ${p.categorySlug} no existe`);
      for (const use of p.uses) if (!uses.has(use)) fail(["products", i], `uso ${use} no existe`);
      for (const rel of p.related)
        if (!products.has(rel) || rel === p.slug)
          fail(["products", i], `relacionado ${rel} inválido`);
      if (p.variants.filter((v) => v.isDefault).length !== 1)
        fail(["products", i], "debe tener exactamente una variante por defecto");
      const colors = p.variants.map((v) => v.colorKey);
      if (new Set(colors).size !== colors.length) fail(["products", i], "colores repetidos");
      // Cada parte tiene clave única en la base (BD-031) y SQL Server no distingue mayúsculas
      // (collation CI): un repetido se fundiría en una sola fila y la base diferiría de fixtures.
      const partKeys: [string, string[]][] = [
        ["especificación", p.specs.map((s) => `${s.groupName}|${s.label}`)],
        ["medida", p.dimensions.map((d) => d.partKey)],
        ["empaque", p.packagings.map((k) => k.code)],
        ["beneficio", p.benefits.map((b) => b.iconKey)],
        ["uso", p.uses],
        ["relacionado", p.related],
      ];
      for (const [part, keys] of partKeys) {
        const lower = keys.map((k) => k.toLowerCase());
        if (new Set(lower).size !== lower.length)
          fail(["products", i], `${part} con clave repetida`);
      }
      // Los códigos de ejemplo nunca deben parecer de SAP (PT…).
      for (const v of p.variants)
        if (p.sample !== v.sku.startsWith("EJ-"))
          fail(["products", i], `${v.sku}: los ejemplos usan EJ-… y los reales no`);
    });
    data.stores.forEach((s, i) => {
      if (!departments.has(s.departmentSlug))
        fail(["stores", i], `departamento ${s.departmentSlug} no existe`);
    });
    data.faqs.forEach((f, i) => {
      if (f.categorySlug && !categories.has(f.categorySlug))
        fail(["faqs", i], `categoría ${f.categorySlug} no existe`);
      if (f.productSlug && !products.has(f.productSlug))
        fail(["faqs", i], `producto ${f.productSlug} no existe`);
    });
    data.kits.forEach((k, i) => {
      const items = k.items.map((item) => item.description.toLowerCase());
      if (new Set(items).size !== items.length) fail(["kits", i], "línea de kit repetida");
      for (const item of k.items)
        if (item.variantSku && !skus.has(item.variantSku))
          fail(["kits", i], `${item.variantSku} no existe`);
    });
  });

export type SeedData = z.infer<typeof seedDataSchema>;
