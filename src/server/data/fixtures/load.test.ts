// @vitest-environment node
import { describe, expect, it } from "vitest";
import { seedDataSchema } from "../../../../prisma/seed/schema";
import { rawSeedData, seedData } from "./load";

/** Copia profunda de los datos reales para romper una sola cosa en cada prueba. */
const clone = () => structuredClone(rawSeedData) as Record<string, unknown> & typeof rawSeedData;

const issuesOf = (data: unknown) => {
  const result = seedDataSchema.safeParse(data);
  return result.success ? [] : result.error.issues.map((i) => i.message);
};

describe("datos de prisma/seed", () => {
  it("todos los JSON pasan el esquema", () => {
    expect(issuesOf(rawSeedData)).toEqual([]);
    expect(seedData().products.length).toBeGreaterThan(1);
  });

  it("rechaza un slug repetido", () => {
    const data = clone();
    data.categories.push({ ...data.categories[0]! });
    expect(issuesOf(data)).toContain("boligrafos repetido");
  });

  it("rechaza un producto de una categoría que no existe", () => {
    const data = clone();
    data.products[0]!.categorySlug = "no-existe";
    expect(issuesOf(data)).toContain("categoría no-existe no existe");
  });

  it("rechaza una tienda de un departamento que no existe", () => {
    const data = clone();
    data.stores[0]!.departmentSlug = "no-existe";
    expect(issuesOf(data)).toContain("departamento no-existe no existe");
  });

  it("un producto de ejemplo no puede usar un código de SAP, ni uno real un código EJ-", () => {
    const data = clone();
    const sample = data.products.find((p) => "sample" in p && p.sample)!;
    sample.variants[0]!.sku = "PT99999";
    expect(issuesOf(data).some((m) => m.includes("PT99999"))).toBe(true);
  });

  it("exige exactamente una variante por defecto", () => {
    const data = clone();
    for (const variant of data.products[0]!.variants)
      (variant as { isDefault?: boolean }).isDefault = false;
    expect(issuesOf(data)).toContain("debe tener exactamente una variante por defecto");
  });

  it("exige el destino de cada CTA del hero", () => {
    const data = clone();
    delete (data.content.heroChapters[0] as { ctaHref?: string }).ctaHref;
    expect(issuesOf(data)).toContain("un CTA link requiere ctaHref");
  });

  it("una FAQ de producto debe decir de qué producto es", () => {
    const data = clone();
    const faq = data.faqs.find((f) => f.scope === "product")!;
    delete (faq as { productSlug?: string }).productSlug;
    expect(issuesOf(data)).toContain("scope product requiere productSlug");
  });

  it("los enlaces de tiendas solo pueden ser https", () => {
    const data = clone();
    (data.stores[0] as { onlineShopUrl?: string }).onlineShopUrl = "http://example.com";
    expect(issuesOf(data).length).toBeGreaterThan(0);
  });

  it("las rutas del hero son internas, nunca //otro-dominio", () => {
    const data = clone();
    data.content.heroChapters[0]!.ctaHref = "//evil.example.com";
    expect(issuesOf(data)).toContain("ruta interna que empieza con una sola /");
  });

  it("rechaza una clave de ajuste desconocida", () => {
    const data = clone();
    (data.settings as Record<string, string>).color_favorito = "azul";
    expect(issuesOf(data).length).toBeGreaterThan(0);
  });
});
