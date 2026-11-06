import bcrypt from "bcryptjs";
import { afterAll, describe, expect, it } from "vitest";
import { parseSeedData } from "../../prisma/seed/data";
import type { SeedData } from "../../prisma/seed/schema";
import { seedDatabase } from "../../prisma/seed/seed";
import { db } from "@/server/db";

// Seed (BD-031) contra BolikDigital_Test. Los datos sembrados se quedan a propósito: la batería
// de contrato de la fuente `db` (BD-032) corre sobre ellos. Lo que crean las pruebas (productos
// it-bd031-*, SKU IT-…, el admin de prueba) se borra al final.
const data = parseSeedData();
const PREFIX = "it-bd031";
const ADMIN = { email: "it-admin@bolik66.test", password: "una-clave-de-prueba-larga" };
const SEED_TIMEOUT = 180_000;

const seedSlugs = data.products.map((p) => p.slug);
const ultraJson = data.products.find((p) => p.slug === "bolik-ultra")!;

/** Un producto de prueba aparte, para cambiarle variantes y partes sin tocar los del seed. */
function withTestProduct(variants: SeedData["products"][number]["variants"]): SeedData {
  const product: SeedData["products"][number] = {
    ...ultraJson,
    slug: `${PREFIX}-variantes`,
    name: "Producto de prueba",
    sample: true,
    related: [],
    variants,
  };
  return { ...data, products: [...data.products, product] };
}

const variant = (sku: string, colorKey: string, isDefault = false) => ({
  sku,
  barcode: null,
  colorKey,
  colorName: colorKey,
  colorHex: "#123456",
  isDefault,
  published: true,
});

async function cleanup() {
  await db.product.deleteMany({ where: { slug: { startsWith: PREFIX } } });
  await db.adminUser.deleteMany({ where: { email: ADMIN.email } });
}

afterAll(async () => {
  await cleanup();
  await seedDatabase(db, data, { profile: "dev" });
  await db.$disconnect();
});

describe("seed de la base (BD-031)", () => {
  it(
    "sembrar dos veces seguidas no duplica datos",
    async () => {
      await cleanup();
      const first = await seedDatabase(db, data, { profile: "dev" });
      const second = await seedDatabase(db, data, { profile: "dev" });
      expect(second).toEqual(first);
      expect(second.warnings).toEqual([]);
      expect(await db.product.count({ where: { slug: { in: seedSlugs } } })).toBe(seedSlugs.length);
      expect(
        await db.productVariant.count({ where: { product: { slug: { in: seedSlugs } } } }),
      ).toBe(data.products.flatMap((p) => p.variants).length);
      expect(await db.productSpec.count({ where: { product: { slug: "bolik-ultra" } } })).toBe(
        ultraJson.specs.length,
      );
    },
    SEED_TIMEOUT,
  );

  it("el Bolik Ultra tiene PT00058/59/60 con sus códigos de barras y sus partes", async () => {
    const ultra = await db.product.findUniqueOrThrow({
      where: { slug: "bolik-ultra" },
      include: {
        variants: { orderBy: { sortOrder: "asc" } },
        packagings: true,
        benefits: true,
        relatedFrom: true,
        uses: true,
      },
    });
    expect(ultra.isSample).toBe(false);
    expect(ultra.variants.map((v) => [v.sku, v.barcode, v.colorKey])).toEqual([
      ["PT00058", "759364663092", "azul"],
      ["PT00059", "759364663108", "negro"],
      ["PT00060", "759364663115", "rojo"],
    ]);
    expect(ultra.packagings).toHaveLength(ultraJson.packagings.length);
    expect(ultra.benefits).toHaveLength(ultraJson.benefits.length);
    expect(ultra.relatedFrom).toHaveLength(ultraJson.related.length);
    expect(ultra.uses).toHaveLength(ultraJson.uses.length);
    expect(JSON.parse(ultra.keyFacts!)).toEqual(ultraJson.keyFacts);
    expect(await db.product.count({ where: { slug: { in: seedSlugs }, isSample: true } })).toBe(
      data.products.filter((p) => p.sample).length,
    );
  });

  it(
    "en sync restaura lo editado y quita las partes que ya no están en el JSON",
    async () => {
      const ultra = await db.product.findUniqueOrThrow({ where: { slug: "bolik-ultra" } });
      await db.product.update({ where: { id: ultra.id }, data: { tagline: "Editado" } });
      await db.productSpec.create({
        data: { productId: ultra.id, groupName: "General", label: "Sobra", value: "x" },
      });
      await db.packaging.create({
        data: { productId: ultra.id, code: "sobra", name: "Sobra", unitsPerPack: 1 },
      });
      await db.productBenefit.create({
        data: { productId: ultra.id, iconKey: "sobra", title: "Sobra" },
      });
      const other = await db.product.findUniqueOrThrow({ where: { slug: "goma-escolar" } });
      await db.productRelation.create({ data: { fromId: ultra.id, toId: other.id } });

      await seedDatabase(db, data, { profile: "dev" });
      const after = await db.product.findUniqueOrThrow({
        where: { id: ultra.id },
        include: { specs: true, packagings: true, benefits: true, relatedFrom: true },
      });
      expect(after.tagline).toBe(ultraJson.tagline ?? null);
      expect(after.specs.some((s) => s.label === "Sobra")).toBe(false);
      expect(after.packagings.some((k) => k.code === "sobra")).toBe(false);
      expect(after.benefits.some((b) => b.iconKey === "sobra")).toBe(false);
      expect(after.relatedFrom.some((r) => r.toId === other.id)).toBe(false);
    },
    SEED_TIMEOUT,
  );

  it(
    "en sync acepta un SKU nuevo para un color y colores intercambiados",
    async () => {
      await seedDatabase(
        db,
        withTestProduct([variant("IT-0001", "azul", true), variant("IT-0002", "rojo")]),
        { profile: "dev" },
      );
      // El azul cambia de SKU (como cuando llega el código SAP) y el rojo pasa a ser verde.
      await seedDatabase(
        db,
        withTestProduct([variant("IT-0003", "azul", true), variant("IT-0002", "verde")]),
        { profile: "dev" },
      );
      const variants = await db.productVariant.findMany({
        where: { product: { slug: `${PREFIX}-variantes` } },
        orderBy: { sku: "asc" },
      });
      expect(variants.map((v) => [v.sku, v.colorKey, v.published, v.isDefault])).toEqual([
        ["IT-0001", `retirado-${variants[0]!.id}`, false, false],
        ["IT-0002", "verde", true, false],
        ["IT-0003", "azul", true, true],
      ]);
      // Intercambio: el azul pasa a ser verde y el verde, azul.
      await seedDatabase(
        db,
        withTestProduct([variant("IT-0003", "verde", true), variant("IT-0002", "azul")]),
        { profile: "dev" },
      );
      const swapped = await db.productVariant.findMany({
        where: { sku: { in: ["IT-0002", "IT-0003"] } },
        orderBy: { sku: "asc" },
      });
      expect(swapped.map((v) => v.colorKey)).toEqual(["azul", "verde"]);
    },
    SEED_TIMEOUT,
  );

  it(
    "en sync despublica los ejemplos que salieron del JSON",
    async () => {
      await seedDatabase(db, withTestProduct([variant("IT-0004", "azul", true)]), {
        profile: "dev",
      });
      await db.product.update({
        where: { slug: `${PREFIX}-variantes` },
        data: { published: true },
      });
      await seedDatabase(db, data, { profile: "dev" });
      const removed = await db.product.findUniqueOrThrow({
        where: { slug: `${PREFIX}-variantes` },
      });
      expect(removed.published).toBe(false);
    },
    SEED_TIMEOUT,
  );

  it(
    "el perfil prod no pisa lo editado, no borra nada y no cambia updatedAt",
    async () => {
      const ultra = await db.product.findUniqueOrThrow({ where: { slug: "bolik-ultra" } });
      await db.product.update({
        where: { id: ultra.id },
        data: { tagline: "Editado en el admin" },
      });
      await db.siteSetting.update({ where: { key: "phone" }, data: { value: "+502 0000 0000" } });
      const before = await seedDatabase(db, data, { profile: "prod" });
      const edited = await db.product.findUniqueOrThrow({ where: { id: ultra.id } });
      try {
        const again = await seedDatabase(db, data, { profile: "prod" });
        expect(again).toEqual(before);
        const after = await db.product.findUniqueOrThrow({ where: { id: ultra.id } });
        expect(after.tagline).toBe("Editado en el admin");
        expect(after.updatedAt).toEqual(edited.updatedAt);
        expect((await db.siteSetting.findUniqueOrThrow({ where: { key: "phone" } })).value).toBe(
          "+502 0000 0000",
        );
        // Los ejemplos que ya estaban no se borran (prod nunca borra), pero prod no los toca.
        expect(await db.product.count({ where: { slug: { in: seedSlugs }, isSample: true } })).toBe(
          data.products.filter((p) => p.sample).length,
        );
      } finally {
        await seedDatabase(db, data, { profile: "dev" });
      }
    },
    SEED_TIMEOUT,
  );

  it(
    "el perfil prod no le quita a otro producto un SKU que ya existe",
    async () => {
      // El Bolik Ultra "renombrado" en el admin: el slug del JSON ya no existe, pero sus SKU sí.
      await db.product.update({
        where: { slug: "bolik-ultra" },
        data: { slug: `${PREFIX}-ultra` },
      });
      try {
        const { warnings } = await seedDatabase(db, data, { profile: "prod" });
        expect(warnings).toEqual([
          "Producto bolik-ultra omitido: PT00058, PT00059, PT00060 ya existe en otro producto.",
        ]);
        expect(await db.product.findUnique({ where: { slug: "bolik-ultra" } })).toBeNull();
        expect(
          await db.productVariant.count({ where: { product: { slug: `${PREFIX}-ultra` } } }),
        ).toBe(3);
      } finally {
        await db.product.update({
          where: { slug: `${PREFIX}-ultra` },
          data: { slug: "bolik-ultra" },
        });
      }
    },
    SEED_TIMEOUT,
  );

  it(
    "crea el admin con su contraseña cifrada y no la cambia al volver a sembrar",
    async () => {
      await db.adminUser.deleteMany({ where: { email: ADMIN.email } });
      await seedDatabase(db, data, { profile: "prod", admin: ADMIN });
      const admin = await db.adminUser.findUniqueOrThrow({ where: { email: ADMIN.email } });
      expect(admin.role).toBe("admin");
      expect(admin.passwordHash).not.toContain(ADMIN.password);
      expect(await bcrypt.compare(ADMIN.password, admin.passwordHash)).toBe(true);

      await seedDatabase(db, data, {
        profile: "prod",
        admin: { email: ADMIN.email.toUpperCase(), password: "otra-clave-distinta-larga" },
      });
      const again = await db.adminUser.findUniqueOrThrow({ where: { email: ADMIN.email } });
      expect(again.passwordHash).toBe(admin.passwordHash);
      expect(await db.adminUser.count({ where: { email: ADMIN.email } })).toBe(1);
    },
    SEED_TIMEOUT,
  );
});
