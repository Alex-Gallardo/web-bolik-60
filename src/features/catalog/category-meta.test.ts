import { describe, expect, it } from "vitest";
import { parseSeedData } from "../../../prisma/seed/data";
import { categoryMeta } from "./category-meta";

const close = "Encuentra dónde comprar o cotiza por mayor con Bolik, hecho en Guatemala.";

describe("categoryMeta (BD-061)", () => {
  it("usa los propios y, si faltan, la plantilla de docs/10 §1", () => {
    expect(
      categoryMeta({ name: "Marcadores", shortText: "Corto.", seoTitle: "T", seoDescription: "D" }),
    ).toEqual({ title: "T", description: "D" });
    expect(
      categoryMeta({
        name: "Marcadores",
        shortText: "Corto.",
        seoTitle: null,
        seoDescription: null,
      }),
    ).toEqual({ title: "Marcadores", description: `Marcadores Bolik: Corto. ${close}` });
    // Si con el nombre pasa de 160, va sin él.
    const long = "x".repeat(80);
    expect(
      categoryMeta({ name: "Nombre largo", shortText: long, seoTitle: null, seoDescription: null })
        .description,
    ).toBe(`${long} ${close}`);
  });

  it("en todo el seed: únicos, title ≤ 60 con « | Bolik» y description de 140–160", () => {
    const metas = parseSeedData().categories.map((c) =>
      categoryMeta({
        ...c,
        seoTitle: c.seoTitle ?? null,
        seoDescription: c.seoDescription ?? null,
      }),
    );
    expect(new Set(metas.map((m) => m.title)).size).toBe(metas.length);
    expect(new Set(metas.map((m) => m.description)).size).toBe(metas.length);
    for (const meta of metas) {
      expect(`${meta.title} | Bolik`.length, meta.title).toBeLessThanOrEqual(60);
      expect(meta.description.length, meta.description).toBeGreaterThanOrEqual(140);
      expect(meta.description.length, meta.description).toBeLessThanOrEqual(160);
    }
  });
});
