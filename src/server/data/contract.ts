import { describe, expect, it } from "vitest";
import type { DataSource } from "./types";
import { matchVariantCode } from "./variant-code";

/**
 * Batería de contrato (BD-037): lo que toda fuente de datos debe cumplir con los datos de
 * prisma/seed. Corre contra la fuente de ejemplo en las pruebas unitarias y, en BD-032, contra
 * Prisma sobre BolikDigital_Test ya sembrada. Solo usa datos reales (nada marcado `sample`), que
 * también existen en la base.
 */
export function describeDataSourceContract(name: string, getSource: () => DataSource) {
  describe(`contrato de datos: ${name}`, () => {
    const source = () => getSource();

    it("lista las 8 categorías con su enlace, en orden", async () => {
      const categories = await source().listCategories();
      expect(categories.map((c) => c.slug).slice(0, 2)).toEqual([
        "boligrafos",
        "lapices-y-lapices-de-colores",
      ]);
      expect(categories).toHaveLength(8);
      const boligrafos = categories[0]!;
      expect(boligrafos).toMatchObject({ href: "/productos/boligrafos", lineGroup: "escritura" });
      expect(boligrafos.productCount).toBeGreaterThanOrEqual(1);
    });

    it("trae el Bolik Ultra completo, con PT00058/59/60 y sus códigos de barras", async () => {
      const ultra = await source().getProduct("boligrafos", "bolik-ultra");
      expect(ultra).not.toBeNull();
      expect(ultra!.href).toBe("/productos/boligrafos/bolik-ultra");
      expect(ultra!.sample).toBe(false);
      expect(ultra!.variants.map((v) => [v.sku, v.barcode, v.color.key])).toEqual([
        ["PT00058", "759364663092", "azul"],
        ["PT00059", "759364663108", "negro"],
        ["PT00060", "759364663115", "rojo"],
      ]);
      expect(ultra!.variants.filter((v) => v.isDefault)).toHaveLength(1);
      expect(ultra!.packagings.map((p) => p.code)).toEqual([
        "blister1",
        "blister3",
        "blister5",
        "cajilla12",
        "fardo",
      ]);
      expect(ultra!.packagings.find((p) => p.code === "fardo")).toMatchObject({
        unitsPerPack: 1200,
        innerPacks: 100,
      });
      expect(ultra!.dimensions.find((d) => d.partKey === "body")?.valueMm).toBe(145.83);
      expect(ultra!.specs.map((g) => g.name)).toEqual(["General", "Tinta", "Materiales"]);
      expect(ultra!.benefits).toHaveLength(4);
      expect(ultra!.keyFacts.length).toBeGreaterThan(0);
      expect(ultra!.safetyWarning).toContain("menores de 3 años");
    });

    it("no encuentra un producto con la categoría equivocada ni uno que no existe", async () => {
      expect(await source().getProduct("marcadores", "bolik-ultra")).toBeNull();
      expect(await source().getProduct("boligrafos", "no-existe")).toBeNull();
    });

    it("el producto destacado es el Bolik Ultra", async () => {
      expect((await source().getFeaturedProduct())?.slug).toBe("bolik-ultra");
    });

    it("filtra productos por categoría y por uso", async () => {
      const boligrafos = await source().listProducts({ categorySlug: "boligrafos" });
      expect(boligrafos.every((p) => p.category.slug === "boligrafos")).toBe(true);
      expect(boligrafos.map((p) => p.slug)).toContain("bolik-ultra");
      const oficina = await source().listProducts({ useSlug: "oficina" });
      expect(oficina.map((p) => p.slug)).toContain("bolik-ultra");
    });

    it("el índice de variantes permite buscar por SKU y por código de barras", async () => {
      const index = await source().listVariantMatches();
      expect(matchVariantCode(index, "pt00059")?.variant.color.key).toBe("negro");
      expect(matchVariantCode(index, " PT-00058 ")?.variant.sku).toBe("PT00058");
      const byBarcode = matchVariantCode(index, "759364663108");
      expect(byBarcode?.variant.sku).toBe("PT00059");
      expect(byBarcode?.product.slug).toBe("bolik-ultra");
      expect(matchVariantCode(index, "000000000000")).toBeNull();
      expect(matchVariantCode(index, "   ")).toBeNull();
    });

    it("tiene los 22 departamentos de Guatemala y El Salvador", async () => {
      const departments = await source().listDepartments();
      expect(departments.filter((d) => d.country === "GT")).toHaveLength(22);
      expect(departments.filter((d) => d.country === "SV")).toHaveLength(1);
      const quetzaltenango = await source().getDepartment("quetzaltenango");
      expect(quetzaltenango).toMatchObject({ href: "/donde-comprar/quetzaltenango" });
      expect(quetzaltenango!.storeCount).toBeGreaterThan(0);
      expect(await source().getDepartment("no-existe")).toBeNull();
    });

    it("filtra tiendas por departamento y las que venden en línea", async () => {
      const quetzaltenango = await source().listStores({ departmentSlug: "quetzaltenango" });
      expect(quetzaltenango.length).toBeGreaterThan(0);
      expect(quetzaltenango.every((s) => s.department.slug === "quetzaltenango")).toBe(true);
      const online = await source().listStores({ onlineOnly: true });
      expect(online.map((s) => s.slug).sort()).toEqual(["la-torre", "walmart"]);
    });

    it("las FAQs de la home son 6, solo publicadas", async () => {
      const home = await source().listFaqs({ scope: "home" });
      expect(home).toHaveLength(6);
      expect(home[0]!.question).toBe("¿Dónde se fabrican los productos Bolik?");
      const ultra = await source().listFaqs({ scope: "product", productSlug: "bolik-ultra" });
      expect(ultra.length).toBeGreaterThan(0);
      // La de personalizados espera el pedido mínimo: no se publica todavía.
      expect(await source().listFaqs({ scope: "empresas" })).toEqual([]);
    });

    it("el hero tiene 4 capítulos con su llamado a la acción", async () => {
      const chapters = await source().listHeroChapters();
      expect(chapters.map((c) => c.key)).toEqual(["planta", "aula", "oficina", "libreria"]);
      expect(chapters[0]!.cta).toEqual({
        kind: "link",
        label: "Ver productos",
        href: "/productos",
      });
      expect(chapters[3]!.cta).toMatchObject({ kind: "quote", quoteType: "libreria" });
      // CTA secundario de doc 17 §2 y póster de ejemplo resuelto desde MediaAsset (BD-050).
      expect(chapters.map((c) => c.secondaryCta?.href)).toEqual([
        "/nuestra-historia",
        "/escuelas",
        "/empresas",
        "/mayoreo#distribuidor",
      ]);
      expect(chapters[0]!.poster).toEqual({
        src: "/media/hero/planta-c6dcd764",
        alt: expect.stringContaining("Bolik Ultra") as string,
        width: 1280,
        height: 720,
        blurDataUrl: null,
      });
      expect(chapters.every((c) => c.poster && c.videoDesktop?.startsWith("/media/video/"))).toBe(
        true,
      );
    });

    it("solo muestra cifras publicadas e hitos verificados", async () => {
      const stats = await source().listSiteStats();
      expect(stats.map((s) => s.key)).toEqual(["anios"]);
      const milestones = await source().listMilestones();
      expect(milestones.map((m) => m.year)).toEqual([1966, 2026]);
    });

    it("ningún kit publicado todavía", async () => {
      expect(await source().listKits()).toEqual([]);
    });

    it("una sección sin apariencia guardada usa la del código", async () => {
      expect(await source().getSectionAppearance("home.hero")).toBeNull();
    });

    it("los ajustes traen el teléfono y nunca un WhatsApp inventado", async () => {
      const settings = await source().getSiteSettings();
      expect(settings.phone).toBe("+502 6628 2600");
      expect(settings.whatsappNumber).toBeNull();
      expect(settings.splashEnabled).toBe(true);
    });

    it("los ajustes traen el NAP completo del pie y la página de Facebook", async () => {
      const settings = await source().getSiteSettings();
      expect(settings.address).toBe("6a. Avenida 6-31, zona 2, San José Villa Nueva, Guatemala");
      expect(settings.legalName).toBe("Industrias Bolik, S.A.");
      expect(settings.socialFacebook).toMatch(/^https:\/\/www\.facebook\.com\//);
    });
  });
}
