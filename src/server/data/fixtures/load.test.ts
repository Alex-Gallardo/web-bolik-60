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

  it("rechaza un código de barras con el dígito verificador equivocado", () => {
    const data = clone();
    data.products[0]!.variants[0]!.barcode = "759364663093";
    expect(issuesOf(data)).toContain("código de barras con dígito verificador inválido");
  });

  it("rechaza partes repetidas de un producto aunque cambien las mayúsculas", () => {
    const data = clone();
    const ultra = data.products[0]!;
    ultra.specs!.push({ ...ultra.specs![0]!, label: ultra.specs![0]!.label.toUpperCase() });
    ultra.packagings!.push({ ...ultra.packagings![0]! });
    expect(issuesOf(data)).toEqual(
      expect.arrayContaining(["especificación con clave repetida", "empaque con clave repetida"]),
    );
  });

  it("rechaza una línea de kit repetida", () => {
    const data = clone();
    const kit = data.kits[0]!;
    kit.items.push({ ...kit.items[0]! });
    expect(issuesOf(data)).toContain("línea de kit repetida");
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

  it("el CTA secundario del hero es interno y lleva texto y enlace (BD-050)", () => {
    const data = clone();
    data.content.heroChapters[0]!.secondaryCtaHref = "//evil.example.com";
    expect(issuesOf(data)).toContain("ruta interna que empieza con una sola /");
    const sinTexto = clone();
    delete (sinTexto.content.heroChapters[1] as { secondaryCtaLabel?: string }).secondaryCtaLabel;
    expect(issuesOf(sinTexto)).toContain("el CTA secundario lleva texto y enlace, o ninguno");
  });

  it("el póster del hero existe en media.json y, si es de ejemplo, va marcado (BD-050)", () => {
    const data = clone();
    data.content.heroChapters[0]!.posterKey = "hero/no-existe-00000000";
    expect(issuesOf(data)).toContain("póster hero/no-existe-00000000 no está en media.json");
    const sinMarca = clone();
    sinMarca.content.heroChapters[0]!.sampleMedia = false;
    expect(issuesOf(sinMarca)).toContain("un póster de ejemplo requiere sampleMedia");
    const claveMala = clone();
    claveMala.media[0]!.key = "Hero/Planta.jpg";
    expect(issuesOf(claveMala)).toContain("clave carpeta/nombre-hash8 de process-image.ts");
    const repetida = clone();
    repetida.media.push({ ...repetida.media[0]! });
    expect(issuesOf(repetida)).toContain("hero/planta-c6dcd764 repetido");
  });

  it("rechaza una clave de ajuste desconocida", () => {
    const data = clone();
    (data.settings as Record<string, string>).color_favorito = "azul";
    expect(issuesOf(data).length).toBeGreaterThan(0);
  });
});
