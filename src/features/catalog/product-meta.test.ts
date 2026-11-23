import { describe, expect, it } from "vitest";
import { parseSeedData } from "../../../prisma/seed/data";
import { productMeta } from "./product-meta";

const close = "Encuentra dónde comprar o cotiza por mayor con Bolik, hecho en Guatemala.";
const base = {
  name: "Bolik Ultra",
  tagline: "Bolígrafo hexagonal.",
  shortDescription: "Corto.",
  keyFacts: [] as string[],
  seoTitle: null,
  seoDescription: null,
  category: { name: "Bolígrafos" },
};

describe("productMeta (BD-062)", () => {
  it("usa los propios si los tiene", () => {
    expect(productMeta({ ...base, seoTitle: "T", seoDescription: "D" })).toEqual({
      title: "T",
      description: "D",
    });
  });

  it("arma la plantilla de docs/10 §1 con el primer dato clave que cabe", () => {
    const long = "x".repeat(120);
    expect(productMeta({ ...base, keyFacts: [long, "Punta de 1.0 mm."] })).toEqual({
      title: "Bolik Ultra, bolígrafo hexagonal",
      description: `Bolik Ultra: Bolígrafo hexagonal. Punta de 1.0 mm. ${close}`,
    });
    // Sin dato clave que quepa, sin él.
    expect(productMeta({ ...base, keyFacts: [long] }).description).toBe(
      `Bolik Ultra: Bolígrafo hexagonal. ${close}`,
    );
  });

  it("title de docs/10 §2: con la categoría si no hay tagline o no cabe en 52", () => {
    expect(productMeta({ ...base, tagline: null }).title).toBe("Bolik Ultra, bolígrafos");
    expect(productMeta({ ...base, tagline: "x".repeat(60) }).title).toBe("Bolik Ultra, bolígrafos");
    expect(productMeta({ ...base, name: "N".repeat(50), tagline: null }).title).toBe(
      "N".repeat(50),
    );
  });

  it("sin tagline usa la descripción corta; si no cabe, la recorta en una palabra", () => {
    expect(productMeta({ ...base, tagline: null }).description).toBe(
      `Bolik Ultra: Corto. ${close}`,
    );
    // Con el nombre no cabe: va sin el nombre, con el cierre (BD-090), antes que recortarla.
    const medium = `${"palabra ".repeat(9)}fin.`;
    expect(
      productMeta({ ...base, name: "N".repeat(20), tagline: null, shortDescription: medium })
        .description,
    ).toBe(`${medium.slice(0, -1)}. ${close}`);
    const long = `${"palabra ".repeat(30)}fin.`;
    const description = productMeta({ ...base, tagline: null, shortDescription: long }).description;
    expect(description.length).toBeLessThanOrEqual(160);
    expect(description).toMatch(/^palabra .*palabra…$/);
  });

  it("en todo el seed: únicas, title ≤ 60 con « | Bolik» y description ≤ 160", () => {
    const data = parseSeedData();
    const metas = data.products.map((p) =>
      productMeta({
        ...p,
        category: data.categories.find((c) => c.slug === p.categorySlug)!,
        tagline: p.tagline ?? null,
        seoTitle: p.seoTitle ?? null,
        seoDescription: p.seoDescription ?? null,
      }),
    );
    expect(new Set(metas.map((m) => m.title)).size).toBe(metas.length);
    expect(new Set(metas.map((m) => m.description)).size).toBe(metas.length);
    for (const meta of metas) {
      expect(`${meta.title} | Bolik`.length, meta.title).toBeLessThanOrEqual(60);
      expect(meta.description.length, meta.description).toBeLessThanOrEqual(160);
    }
    // El Bolik Ultra lleva los de docs/10 §1 y docs/17 §6.
    expect(metas[0]!.title).toBe("Bolik Ultra, bolígrafo hexagonal punta 1.0 mm");
  });
});
