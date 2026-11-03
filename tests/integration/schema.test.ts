import { afterAll, describe, expect, it } from "vitest";
import { db } from "@/server/db";

// Esquema del MVP (BD-030) contra BolikDigital_Test: relaciones del catálogo y la cotización, y
// las reglas de borrado que SQL Server aplica. Cada prueba limpia lo que crea.
const SLUG = "it-bd030";

async function cleanup() {
  await db.quoteRequest.deleteMany({ where: { folio: { startsWith: "COT-IT-" } } });
  await db.product.deleteMany({ where: { slug: { startsWith: SLUG } } });
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

  it("guarda tildes y ñ en los textos (NVARCHAR)", async () => {
    const category = await db.category.findUniqueOrThrow({ where: { slug: `${SLUG}-boligrafos` } });
    expect(category.name).toBe("Bolígrafos");
    expect(category.shortText).toBe("Para escribir todos los días.");
  });

  it("no permite dos variantes con el mismo SKU", async () => {
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
    ).rejects.toThrow();
  });

  it("crea una cotización con líneas que apuntan a variantes", async () => {
    const product = await db.product.findUniqueOrThrow({
      where: { slug: `${SLUG}-a` },
      include: { variants: true },
    });
    const quote = await db.quoteRequest.create({
      data: {
        folio: "COT-IT-000001",
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

  it("protege el historial: no borra un producto que aparece en una cotización", async () => {
    await expect(db.product.delete({ where: { slug: `${SLUG}-a` } })).rejects.toThrow();
  });

  it("al borrar una cotización se borran sus líneas (cascada)", async () => {
    const quote = await db.quoteRequest.findUniqueOrThrow({ where: { folio: "COT-IT-000001" } });
    await db.quoteRequest.delete({ where: { id: quote.id } });
    expect(await db.quoteItem.count({ where: { quoteId: quote.id } })).toBe(0);
  });

  it("al borrar un producto sin cotizaciones se borran sus variantes y empaques (cascada)", async () => {
    const product = await createProduct("b");
    await db.product.delete({ where: { id: product.id } });
    expect(await db.productVariant.count({ where: { productId: product.id } })).toBe(0);
    expect(await db.packaging.count({ where: { productId: product.id } })).toBe(0);
  });
});
