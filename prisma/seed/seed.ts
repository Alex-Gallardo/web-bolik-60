import bcrypt from "bcryptjs";
import type { Prisma, PrismaClient } from "../../src/generated/prisma/client";
import type { Role } from "../../src/lib/constants";
import { dataForProfile, seedMode, type SeedMode, type SeedProfile } from "./profiles";
import type { SeedData } from "./schema";

/**
 * Carga los datos de prisma/seed en SQL Server (BD-031, docs/05 §6). Idempotente: cada fila se
 * busca por su clave natural (slug, sku, key…), así que sembrar dos veces no duplica nada.
 * - sync (dev, e2e): el JSON manda; actualiza lo que existe, quita las partes de un producto o
 *   kit que ya no están en el JSON y despublica los ejemplos que salieron del JSON. Las variantes
 *   nunca se borran (las cotizaciones las citan): las que salen del JSON quedan despublicadas.
 * - create-only (prod): crea lo que falta y no toca lo que ya existe, ni sus partes: lo editado en
 *   el admin sobrevive a un re-seed. Lo que se BORRÓ en el admin, en cambio, vuelve a crearse
 *   (docs/05 §6): el admin despublica en lugar de borrar.
 * El perfil decide el modo y filtra los datos aquí dentro: prod nunca recibe ejemplos.
 * El orden del arreglo es el sortOrder. No lee variables de entorno: el admin llega por `admin`.
 */

type Db = PrismaClient | Prisma.TransactionClient;

export type SeedAdmin = { email: string; password: string; name?: string };

export type SeedOptions = { profile: SeedProfile; admin?: SeedAdmin };

/** Coste de bcrypt del doc 05 §2. */
export const BCRYPT_COST = 12;

/** Las tablas que llena el seed y cuántas filas tienen al terminar. */
export type SeedReport = Record<string, number>;

/** Conteos al terminar y avisos (lo que se omitió y por qué). */
export type SeedResult = { counts: SeedReport; warnings: string[] };

/** Una base remota (staging) tarda más que la local: los 5 s por defecto se quedan cortos. */
const TX_OPTIONS = { timeout: 30_000 } as const;

/** Para upsert: en create-only la actualización no cambia nada. */
const updateFor = <T extends object>(mode: SeedMode, data: T): T | Record<string, never> =>
  mode === "sync" ? data : {};

export async function seedDatabase(
  db: PrismaClient,
  allData: SeedData,
  { profile, admin }: SeedOptions,
): Promise<SeedResult> {
  const mode = seedMode(profile);
  const data = dataForProfile(allData, profile);
  const warnings: string[] = [];
  const departmentIds = new Map<string, number>();
  for (const d of data.departments) {
    const row = { name: d.name, country: d.country, lat: d.lat, lng: d.lng };
    const { id } = await db.department.upsert({
      where: { slug: d.slug },
      create: { slug: d.slug, ...row },
      update: updateFor(mode, row),
    });
    departmentIds.set(d.slug, id);
  }

  const categoryIds = new Map<string, number>();
  for (const [sortOrder, c] of data.categories.entries()) {
    const row = {
      name: c.name,
      lineGroup: c.lineGroup,
      shortText: c.shortText,
      intro: c.intro ?? null,
      published: c.published,
      sortOrder,
    };
    const { id } = await db.category.upsert({
      where: { slug: c.slug },
      create: { slug: c.slug, ...row },
      update: updateFor(mode, row),
    });
    categoryIds.set(c.slug, id);
  }

  const useTagIds = new Map<string, number>();
  for (const u of data.useTags) {
    const { id } = await db.useTag.upsert({
      where: { slug: u.slug },
      create: { slug: u.slug, name: u.name },
      update: updateFor(mode, { name: u.name }),
    });
    useTagIds.set(u.slug, id);
  }

  // Productos: cada uno en su transacción, con sus partes. Las relaciones van después, cuando
  // ya existen todos los productos.
  const productIds = new Map<string, number>();
  const createdProducts = new Set<string>();
  for (const [sortOrder, p] of data.products.entries()) {
    const existing = await db.product.findUnique({ where: { slug: p.slug }, select: { id: true } });
    if (existing && mode === "create-only") {
      productIds.set(p.slug, existing.id);
      continue;
    }
    if (mode === "create-only") {
      // Un SKU que ya existe pertenece a otro producto (renombrado en el admin o creado por la
      // sincronización con SAP): crear este producto se lo quitaría. Se omite y se avisa.
      const taken = await db.productVariant.findMany({
        where: { sku: { in: p.variants.map((v) => v.sku) } },
        select: { sku: true },
      });
      if (taken.length > 0) {
        warnings.push(
          `Producto ${p.slug} omitido: ${taken
            .map((v) => v.sku)
            .sort()
            .join(", ")} ya existe en otro producto.`,
        );
        continue;
      }
    }
    const id = await db.$transaction(
      (tx) =>
        upsertProduct(tx, p, {
          sortOrder,
          categoryId: categoryIds.get(p.categorySlug)!,
          useTagIds,
        }),
      TX_OPTIONS,
    );
    productIds.set(p.slug, id);
    if (!existing) createdProducts.add(p.slug);
  }

  for (const p of data.products) {
    const fromId = productIds.get(p.slug);
    if (fromId === undefined) continue; // omitido arriba
    if (mode === "create-only" && !createdProducts.has(p.slug)) continue;
    const toIds = p.related.flatMap((slug) => productIds.get(slug) ?? []);
    if (mode === "sync") {
      await db.productRelation.deleteMany({ where: { fromId, toId: { notIn: toIds } } });
    }
    for (const [sortOrder, toId] of toIds.entries()) {
      await db.productRelation.upsert({
        where: { fromId_toId: { fromId, toId } },
        create: { fromId, toId, sortOrder },
        update: updateFor(mode, { sortOrder }),
      });
    }
  }

  for (const [sortOrder, s] of data.stores.entries()) {
    const row = {
      name: s.name,
      type: s.type,
      departmentId: departmentIds.get(s.departmentSlug)!,
      municipality: s.municipality ?? null,
      address: s.address ?? null,
      phone: s.phone ?? null,
      websiteUrl: s.websiteUrl ?? null,
      onlineShopUrl: s.onlineShopUrl ?? null,
      lat: s.lat ?? null,
      lng: s.lng ?? null,
      isVerified: s.isVerified,
      published: s.published,
      sortOrder,
    };
    await db.store.upsert({
      where: { slug: s.slug },
      create: { slug: s.slug, ...row },
      update: updateFor(mode, row),
    });
  }

  for (const [sortOrder, f] of data.faqs.entries()) {
    const row = {
      scope: f.scope,
      categoryId: f.categorySlug ? categoryIds.get(f.categorySlug)! : null,
      productId: f.productSlug ? (productIds.get(f.productSlug) ?? null) : null,
      question: f.question,
      answer: f.answer,
      published: f.published,
      sortOrder,
    };
    await db.faq.upsert({
      where: { key: f.key },
      create: { key: f.key, ...row },
      update: updateFor(mode, row),
    });
  }

  // Imágenes ya procesadas (media.json, BD-050): la fila de MediaAsset que resuelve el póster del
  // hero. Los archivos los pone `pnpm media:samples` en MEDIA_DIR; en prod no hay ejemplos.
  for (const m of data.media) {
    const row = {
      kind: "image",
      originalName: m.originalName,
      mime: "image/webp",
      width: m.width,
      height: m.height,
      bytes: m.bytes,
      defaultAlt: m.alt,
    };
    await db.mediaAsset.upsert({
      where: { key: m.key },
      create: { key: m.key, ...row },
      update: updateFor(mode, row),
    });
  }

  await seedContent(db, data.content, mode);

  const skuIds = new Map(
    (await db.productVariant.findMany({ select: { id: true, sku: true } })).map((v) => [
      v.sku,
      v.id,
    ]),
  );
  for (const [sortOrder, k] of data.kits.entries()) {
    const existing = await db.kit.findUnique({ where: { slug: k.slug }, select: { id: true } });
    if (existing && mode === "create-only") continue;
    await db.$transaction(async (tx) => {
      const row = {
        name: k.name,
        level: k.level,
        season: k.season,
        description: k.description,
        suggestedPrice: k.suggestedPrice ?? null,
        priceVisible: k.priceVisible,
        published: k.published,
        isSample: k.sample,
        sortOrder,
      };
      const { id: kitId } = await tx.kit.upsert({
        where: { slug: k.slug },
        create: { slug: k.slug, ...row },
        update: row,
      });
      await tx.kitItem.deleteMany({
        where: { kitId, description: { notIn: k.items.map((i) => i.description) } },
      });
      for (const [itemOrder, item] of k.items.entries()) {
        const itemRow = {
          quantity: item.quantity,
          variantId: item.variantSku ? (skuIds.get(item.variantSku) ?? null) : null,
          sortOrder: itemOrder,
        };
        await tx.kitItem.upsert({
          where: { kitId_description: { kitId, description: item.description } },
          create: { kitId, description: item.description, ...itemRow },
          update: itemRow,
        });
      }
    }, TX_OPTIONS);
  }

  for (const [key, value] of Object.entries(data.settings)) {
    if (value === undefined) continue;
    await db.siteSetting.upsert({
      where: { key },
      create: { key, value },
      update: updateFor(mode, { value }),
    });
  }

  if (mode === "sync") await unpublishRemovedSamples(db, data);

  if (admin) await seedAdmin(db, admin);

  return { counts: await seedReport(db), warnings };
}

/**
 * En sync, un ejemplo que salió del JSON (por ejemplo, cuando BD-038 trae el catálogo real) queda
 * despublicado: borrarlo exigiría limpiar cotizaciones, relaciones y FAQs que lo citan.
 */
async function unpublishRemovedSamples(db: Db, data: SeedData) {
  await db.product.updateMany({
    where: { isSample: true, slug: { notIn: data.products.map((p) => p.slug) } },
    data: { published: false },
  });
  await db.kit.updateMany({
    where: { isSample: true, slug: { notIn: data.kits.map((k) => k.slug) } },
    data: { published: false },
  });
  await db.schoolActivity.updateMany({
    where: { isSample: true, key: { notIn: data.content.activities.map((a) => a.key) } },
    data: { published: false },
  });
}

type ProductContext = {
  sortOrder: number;
  categoryId: number;
  useTagIds: Map<string, number>;
};

/** Crea o actualiza un producto y deja sus partes iguales al JSON. Devuelve su id. */
async function upsertProduct(
  tx: Prisma.TransactionClient,
  p: SeedData["products"][number],
  { sortOrder, categoryId, useTagIds }: ProductContext,
): Promise<number> {
  const row = {
    name: p.name,
    tagline: p.tagline ?? null,
    shortDescription: p.shortDescription,
    description: p.description ?? null,
    keyFacts: p.keyFacts.length > 0 ? JSON.stringify(p.keyFacts) : null,
    safetyWarning: p.safetyWarning ?? null,
    categoryId,
    featured: p.featured,
    published: p.published,
    isSample: p.sample,
    sortOrder,
  };
  const { id: productId } = await tx.product.upsert({
    where: { slug: p.slug },
    create: { slug: p.slug, ...row },
    update: row,
  });

  // Las variantes se buscan por SKU, pero (productId, colorKey) también es único: si el JSON
  // cambia el SKU de un color o intercambia colores, el upsert chocaría con la fila vieja. Antes
  // se apartan: las que salen del JSON quedan despublicadas con una clave de color propia, y las
  // que siguen toman una clave temporal hasta su upsert.
  const skus = new Set(p.variants.map((v) => v.sku));
  const current = await tx.productVariant.findMany({
    where: { productId },
    select: { id: true, sku: true },
  });
  for (const v of current) {
    await tx.productVariant.update({
      where: { id: v.id },
      data: skus.has(v.sku)
        ? { colorKey: `tmp-${v.id}` }
        : { colorKey: `retirado-${v.id}`, published: false, isDefault: false },
    });
  }
  for (const [i, v] of p.variants.entries()) {
    const variant = {
      productId,
      barcode: v.barcode,
      colorKey: v.colorKey,
      colorName: v.colorName,
      colorHex: v.colorHex,
      isDefault: v.isDefault,
      published: v.published,
      sortOrder: i,
    };
    await tx.productVariant.upsert({
      where: { sku: v.sku },
      create: { sku: v.sku, ...variant },
      update: variant,
    });
  }

  await tx.productSpec.deleteMany({
    where: {
      productId,
      NOT: { OR: p.specs.map((s) => ({ groupName: s.groupName, label: s.label })) },
    },
  });
  for (const [i, s] of p.specs.entries()) {
    await tx.productSpec.upsert({
      where: {
        productId_groupName_label: { productId, groupName: s.groupName, label: s.label },
      },
      create: { productId, groupName: s.groupName, label: s.label, value: s.value, sortOrder: i },
      update: { value: s.value, sortOrder: i },
    });
  }

  await tx.productDimension.deleteMany({
    where: { productId, partKey: { notIn: p.dimensions.map((d) => d.partKey) } },
  });
  for (const [i, d] of p.dimensions.entries()) {
    const dimension = {
      label: d.label,
      valueMm: d.valueMm,
      tolerance: d.tolerance ?? null,
      sortOrder: i,
    };
    await tx.productDimension.upsert({
      where: { productId_partKey: { productId, partKey: d.partKey } },
      create: { productId, partKey: d.partKey, ...dimension },
      update: dimension,
    });
  }

  await tx.packaging.deleteMany({
    where: { productId, code: { notIn: p.packagings.map((k) => k.code) } },
  });
  for (const [i, k] of p.packagings.entries()) {
    const packaging = {
      name: k.name,
      unitsPerPack: k.unitsPerPack,
      innerPacks: k.innerPacks ?? null,
      lengthMm: k.lengthMm ?? null,
      widthMm: k.widthMm ?? null,
      heightMm: k.heightMm ?? null,
      weightG: k.weightG ?? null,
      isWholesale: k.isWholesale,
      sortOrder: i,
    };
    await tx.packaging.upsert({
      where: { productId_code: { productId, code: k.code } },
      create: { productId, code: k.code, ...packaging },
      update: packaging,
    });
  }

  await tx.productBenefit.deleteMany({
    where: { productId, iconKey: { notIn: p.benefits.map((b) => b.iconKey) } },
  });
  for (const [i, b] of p.benefits.entries()) {
    const benefit = { title: b.title, text: b.text ?? null, sortOrder: i };
    await tx.productBenefit.upsert({
      where: { productId_iconKey: { productId, iconKey: b.iconKey } },
      create: { productId, iconKey: b.iconKey, ...benefit },
      update: benefit,
    });
  }

  const useIds = p.uses.map((slug) => useTagIds.get(slug)!);
  await tx.productUse.deleteMany({ where: { productId, useTagId: { notIn: useIds } } });
  for (const useTagId of useIds) {
    await tx.productUse.upsert({
      where: { productId_useTagId: { productId, useTagId } },
      create: { productId, useTagId },
      update: {},
    });
  }

  return productId;
}

async function seedContent(db: Db, content: SeedData["content"], mode: SeedMode) {
  for (const [sortOrder, h] of content.heroChapters.entries()) {
    const row = {
      label: h.label,
      hint: h.hint,
      eyebrow: h.eyebrow,
      line: h.line,
      ctaLabel: h.ctaLabel,
      ctaKind: h.ctaKind,
      ctaHref: h.ctaHref ?? null,
      ctaQuoteType: h.ctaQuoteType ?? null,
      secondaryCtaLabel: h.secondaryCtaLabel ?? null,
      secondaryCtaHref: h.secondaryCtaHref ?? null,
      videoDesktop: h.videoDesktop ?? null,
      videoMobile: h.videoMobile ?? null,
      posterKey: h.posterKey ?? null,
      published: h.published,
      sortOrder,
    };
    await db.heroChapter.upsert({
      where: { key: h.key },
      create: { key: h.key, ...row },
      update: updateFor(mode, row),
    });
  }

  for (const [sortOrder, s] of content.stats.entries()) {
    const row = {
      value: s.value,
      prefix: s.prefix ?? null,
      suffix: s.suffix ?? null,
      label: s.label,
      sourceNote: s.sourceNote ?? null,
      published: s.published,
      sortOrder,
    };
    await db.siteStat.upsert({
      where: { key: s.key },
      create: { key: s.key, ...row },
      update: updateFor(mode, row),
    });
  }

  for (const [sortOrder, m] of content.milestones.entries()) {
    const row = {
      year: m.year,
      title: m.title,
      description: m.description,
      isVerified: m.isVerified,
      published: m.published,
      sortOrder,
    };
    await db.historyMilestone.upsert({
      where: { key: m.key },
      create: { key: m.key, ...row },
      update: updateFor(mode, row),
    });
  }

  for (const [sortOrder, a] of content.activities.entries()) {
    const row = {
      title: a.title,
      description: a.description,
      colorKey: a.colorKey,
      iconKey: a.iconKey,
      published: a.published,
      isSample: a.sample,
      sortOrder,
    };
    await db.schoolActivity.upsert({
      where: { key: a.key },
      create: { key: a.key, ...row },
      update: updateFor(mode, row),
    });
  }

  for (const s of content.appearance) {
    const row = { backgroundPreset: s.backgroundPreset, tone: s.tone };
    await db.sectionAppearance.upsert({
      where: { sectionKey: s.sectionKey },
      create: { sectionKey: s.sectionKey, ...row },
      update: updateFor(mode, row),
    });
  }
}

/** Admin inicial: se crea una sola vez; volver a sembrar nunca cambia su contraseña. */
async function seedAdmin(db: Db, { email, password, name }: SeedAdmin) {
  const normalized = email.trim().toLowerCase();
  const existing = await db.adminUser.findUnique({ where: { email: normalized } });
  if (existing) return;
  await db.adminUser.create({
    data: {
      email: normalized,
      name: name ?? "Administrador",
      passwordHash: await bcrypt.hash(password, BCRYPT_COST),
      role: "admin" satisfies Role,
    },
  });
}

async function seedReport(db: Db): Promise<SeedReport> {
  const [
    departamentos,
    categorias,
    usos,
    productos,
    variantes,
    tiendas,
    faqs,
    capitulos,
    cifras,
    hitos,
    actividades,
    kits,
    ajustes,
    admins,
  ] = await Promise.all([
    db.department.count(),
    db.category.count(),
    db.useTag.count(),
    db.product.count(),
    db.productVariant.count(),
    db.store.count(),
    db.faq.count(),
    db.heroChapter.count(),
    db.siteStat.count(),
    db.historyMilestone.count(),
    db.schoolActivity.count(),
    db.kit.count(),
    db.siteSetting.count(),
    db.adminUser.count(),
  ]);
  return {
    departamentos,
    categorías: categorias,
    usos,
    productos,
    variantes,
    tiendas,
    faqs,
    "capítulos del hero": capitulos,
    cifras,
    hitos,
    actividades,
    kits,
    ajustes,
    admins,
  };
}
