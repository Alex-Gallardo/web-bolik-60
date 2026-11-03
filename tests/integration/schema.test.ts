import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/server/db";

// Esquema del MVP (BD-030) contra BolikDigital_Test: relaciones del catálogo y la cotización, y
// las reglas de borrado que SQL Server aplica. Limpia antes (por si una corrida se cortó) y después.
const SLUG = "it-bd030";
const QUOTE_FOLIO = "COT-IT-000001";

async function cleanup() {
  await db.quoteRequest.deleteMany({ where: { folio: { startsWith: "COT-IT-" } } });
  await db.product.deleteMany({ where: { slug: { startsWith: SLUG } } });
  await db.mediaAsset.deleteMany({ where: { key: { startsWith: SLUG } } });
  await db.category.deleteMany({ where: { slug: { startsWith: SLUG } } });
}

async function createProduct(suffix: string) {
  const category = await db.category.upsert({
    where: { slug: `${SLUG}-boligrafos` },
    update: {},
    create: {
      slug: `${SLUG}-boligrafos`,
      name: "Bolígrafos",
      lineGroup: "escritura",
      shortText: "Para escribir todos los días.",
    },
  });
  return db.product.create({
    data: {
      slug: `${SLUG}-${suffix}`,
      name: "Bolik Ultra",
      shortDescription: "El hexagonal de siempre.",
      categoryId: category.id,
      variants: {
        create: [
          { sku: `IT${suffix}01`, colorKey: "azul", colorName: "Azul", colorHex: "#1d3fce" },
          { sku: `IT${suffix}02`, colorKey: "negro", colorName: "Negro", colorHex: "#111318" },
        ],
      },
      packagings: { create: [{ code: "cajilla12", name: "Cajilla de 12", unitsPerPack: 12 }] },
    },
    include: { variants: true, packagings: true, category: true },
  });
}

describe("esquema del MVP", () => {
  beforeAll(cleanup);
  afterAll(async () => {
    await cleanup();
    await db.$disconnect();
  });

  it("crea un producto con categoría, variantes y empaques", async () => {
    const product = await createProduct("a");
    expect(product.category.slug).toBe(`${SLUG}-boligrafos`);
    expect(product.variants.map((v) => v.colorKey).sort()).toEqual(["azul", "negro"]);
    expect(product.packagings[0]?.unitsPerPack).toBe(12);
  });

  it("los textos visibles son NVARCHAR y guardan cualquier carácter", async () => {
    const columns = await db.$queryRaw<{ table: string; column: string; type: string }[]>`
      SELECT TABLE_NAME AS [table], COLUMN_NAME AS [column], DATA_TYPE AS [type]
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE (TABLE_NAME = 'Category' AND COLUMN_NAME IN ('name', 'shortText'))
         OR (TABLE_NAME = 'Product' AND COLUMN_NAME = 'name')
         OR (TABLE_NAME = 'QuoteRequest' AND COLUMN_NAME IN ('organization', 'contactName'))`;
    expect(columns).toHaveLength(5);
    expect(columns.every((c) => c.type === "nvarchar")).toBe(true);

    // "Ā" y "→" no existen en Latin-1: en una columna VARCHAR se convertirían en "?".
    const text = "Año escolar · Pingüino → Ā";
    const category = await db.category.update({
      where: { slug: `${SLUG}-boligrafos` },
      data: { shortText: text },
    });
    expect((await db.category.findUniqueOrThrow({ where: { id: category.id } })).shortText).toBe(
      text,
    );
  });

  it("no permite dos variantes con el mismo SKU (P2002)", async () => {
    const product = await db.product.findUniqueOrThrow({ where: { slug: `${SLUG}-a` } });
    await expect(
      db.productVariant.create({
        data: {
          productId: product.id,
          sku: "ITa01",
          colorKey: "rojo",
          colorName: "Rojo",
          colorHex: "#d42a22",
        },
      }),
    ).rejects.toMatchObject({ code: "P2002" });
  });

  it("crea una cotización con líneas que apuntan a variantes", async () => {
    const product = await db.product.findUniqueOrThrow({
      where: { slug: `${SLUG}-a` },
      include: { variants: true },
    });
    const quote = await db.quoteRequest.create({
      data: {
        folio: QUOTE_FOLIO,
        customerType: "libreria",
        organization: "Librería de prueba",
        contactName: "Persona de prueba",
        items: {
          create: product.variants.map((variant) => ({
            itemType: "variante",
            variantId: variant.id,
            description: `${product.name} ${variant.colorName}`,
            quantity: 3,
            unitLabel: "cajillas",
            packagingCode: "cajilla12",
          })),
        },
      },
      include: { items: true },
    });
    expect(quote.items).toHaveLength(2);
    expect(quote.status).toBe("nueva");
    expect(quote.erpStatus).toBe("pendiente");
  });

  it("protege el historial: no borra un producto que aparece en una cotización (P2003)", async () => {
    await expect(db.product.delete({ where: { slug: `${SLUG}-a` } })).rejects.toMatchObject({
      code: "P2003",
    });
    expect(await db.product.count({ where: { slug: `${SLUG}-a` } })).toBe(1);
  });

  it("al borrar una cotización se borran sus líneas (cascada)", async () => {
    const quote = await db.quoteRequest.findUniqueOrThrow({ where: { folio: QUOTE_FOLIO } });
    await db.quoteRequest.delete({ where: { id: quote.id } });
    expect(await db.quoteItem.count({ where: { quoteId: quote.id } })).toBe(0);
  });

  it("al borrar un producto se borran variantes, empaques e imágenes, aunque la imagen sea de una variante", async () => {
    const product = await createProduct("b");
    const media = await db.mediaAsset.create({
      data: {
        key: `${SLUG}-ultra-azul`,
        originalName: "ultra-azul.jpg",
        mime: "image/jpeg",
        bytes: 1,
      },
    });
    await db.productImage.create({
      data: {
        productId: product.id,
        variantId: product.variants[0]!.id,
        mediaId: media.id,
        alt: "Bolik Ultra azul",
      },
    });

    await db.product.delete({ where: { id: product.id } });
    expect(await db.productVariant.count({ where: { productId: product.id } })).toBe(0);
    expect(await db.packaging.count({ where: { productId: product.id } })).toBe(0);
    expect(await db.productImage.count({ where: { productId: product.id } })).toBe(0);
    // El archivo de la biblioteca de medios se conserva (puede usarse en otro lado).
    expect(await db.mediaAsset.count({ where: { id: media.id } })).toBe(1);
  });
});
