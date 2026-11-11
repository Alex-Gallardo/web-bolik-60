// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { TAGS } from "@/lib/cache-tags";
import { getLlmsData } from "./llms";
import { getSearchIndex } from "./search";
import { listSitemapEntries, SITEMAP_TAGS } from "./sitemap";

// Funciones de BD-032 que arman sitemap, llms y buscador sobre la fuente de ejemplo (la de la base
// se prueba con la misma batería en tests/integration/data-source.test.ts).
const tags = vi.hoisted(() => [] as string[]);
vi.mock("next/cache", () => ({
  cacheLife: () => {},
  cacheTag: (...names: string[]) => tags.push(...names),
}));
vi.mock("@/env", () => ({ env: { DATA_SOURCE: "fixtures" } }));

describe("índice del buscador", () => {
  it("encuentra el Ultra por nombre, SKU y código de barras", async () => {
    tags.length = 0;
    const index = await getSearchIndex();
    const ultra = index.find((e) => e.slug === "bolik-ultra")!;
    expect(ultra).toMatchObject({
      name: "Bolik Ultra",
      href: "/productos/boligrafos/bolik-ultra",
      category: "Bolígrafos",
      skus: ["PT00058", "PT00059", "PT00060"],
      barcodes: ["759364663092", "759364663108", "759364663115"],
      sample: false,
    });
    expect(ultra.colors).toEqual(["Azul", "Negro", "Rojo"]);
    // Un producto sin códigos de barras no inventa ninguno.
    expect(index.find((e) => e.sample)!.barcodes).toEqual([]);
    expect(tags).toEqual(expect.arrayContaining([TAGS.searchIndex, TAGS.products]));
  });
});

describe("datos de llms.txt", () => {
  it("trae categorías, productos, FAQs publicadas y solo departamentos con tiendas", async () => {
    tags.length = 0;
    const data = await getLlmsData();
    expect(data.categories).toHaveLength(8);
    expect(data.products.some((p) => p.slug === "bolik-ultra")).toBe(true);
    expect(data.faqs[0]!.question).toBe("¿Dónde se fabrican los productos Bolik?");
    expect(data.departmentsWithStores.length).toBeGreaterThan(0);
    expect(data.departmentsWithStores.every((d) => d.storeCount > 0)).toBe(true);
    expect(tags).toEqual(expect.arrayContaining([TAGS.llms, TAGS.faqs, TAGS.stores]));
  });
});

describe("entradas del sitemap", () => {
  it("sin base no hay fechas: el sitemap no inventa «ahora»", async () => {
    tags.length = 0;
    const { categories, products, departments, contentUpdatedAt } = await listSitemapEntries();
    expect(categories).toHaveLength(8);
    expect(products.find((p) => p.slug === "bolik-ultra")).toEqual({
      slug: "bolik-ultra",
      categorySlug: "boligrafos",
      updatedAt: null,
      images: [],
    });
    expect(departments.map((d) => d.slug)).toContain("quetzaltenango");
    expect(departments.map((d) => d.slug)).not.toContain("peten"); // sin tiendas
    expect(contentUpdatedAt).toBeNull();
    // Exactos: todo lo que cambia el resultado (incluidos ajustes y apariencia) y nada más.
    expect(tags).toEqual(SITEMAP_TAGS);
    expect(tags).toEqual(expect.arrayContaining([TAGS.settings, TAGS.appearance]));
  });
});
