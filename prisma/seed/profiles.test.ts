// @vitest-environment node
import { describe, expect, it } from "vitest";
import { parseSeedData } from "./data";
import { dataForProfile, isSeedProfile, seedMode, seedTargetProblem } from "./profiles";
import type { SeedData } from "./schema";

const data = parseSeedData();

describe("perfiles del seed (BD-031)", () => {
  it("dev y e2e cargan todo, incluidos los ejemplos, y sincronizan con el JSON", () => {
    expect(dataForProfile(data, "dev")).toBe(data);
    expect(dataForProfile(data, "e2e")).toBe(data);
    expect(seedMode("dev")).toBe("sync");
    expect(seedMode("e2e")).toBe("sync");
  });

  it("prod solo crea lo que falta", () => {
    expect(seedMode("prod")).toBe("create-only");
  });

  it("prod no lleva productos, kits ni actividades de ejemplo", () => {
    const prod = dataForProfile(data, "prod");
    expect(prod.products.map((p) => p.slug)).toEqual(["bolik-ultra"]);
    expect(prod.products.some((p) => p.sample)).toBe(false);
    expect(prod.kits.some((k) => k.sample)).toBe(false);
    expect(prod.content.activities.some((a) => a.sample)).toBe(false);
    // Lo demás va completo.
    expect(prod.categories).toEqual(data.categories);
    expect(prod.stores).toEqual(data.stores);
    expect(prod.content.milestones).toEqual(data.content.milestones);
    expect(prod.settings).toEqual(data.settings);
  });

  it("prod quita las relaciones, FAQs y líneas de kit que apuntan a un ejemplo", () => {
    const ultra = data.products.find((p) => p.slug === "bolik-ultra")!;
    const sample = data.products.find((p) => p.sample)!;
    const custom: SeedData = {
      ...data,
      products: [{ ...ultra, related: [sample.slug] }, sample],
      faqs: [
        { ...data.faqs[0]!, key: "de-ultra", scope: "product", productSlug: "bolik-ultra" },
        { ...data.faqs[0]!, key: "de-ejemplo", scope: "product", productSlug: sample.slug },
        { ...data.faqs[0]!, key: "general" },
      ],
      kits: [
        {
          ...data.kits[0]!,
          slug: "kit-real",
          sample: false,
          items: [
            { description: "Bolik Ultra azul", quantity: 2, variantSku: "PT00058" },
            { description: "Ejemplo", quantity: 1, variantSku: sample.variants[0]!.sku },
            { description: "Cuaderno", quantity: 1 },
          ],
        },
        {
          ...data.kits[0]!,
          slug: "kit-solo-ejemplos",
          sample: false,
          items: [{ description: "Ejemplo", quantity: 1, variantSku: sample.variants[0]!.sku }],
        },
      ],
    };
    const prod = dataForProfile(custom, "prod");
    expect(prod.products.map((p) => [p.slug, p.related])).toEqual([["bolik-ultra", []]]);
    expect(prod.faqs.map((f) => f.key)).toEqual(["de-ultra", "general"]);
    expect(prod.kits.map((k) => [k.slug, k.items.map((i) => i.description)])).toEqual([
      ["kit-real", ["Bolik Ultra azul", "Cuaderno"]],
    ]);
  });

  it("reconoce solo los perfiles conocidos", () => {
    expect(isSeedProfile("prod")).toBe(true);
    expect(isSeedProfile("staging")).toBe(false);
    expect(isSeedProfile("")).toBe(false);
  });
});

describe("seedTargetProblem", () => {
  const local = { appEnv: "development", databaseName: "BolikDigital_Dev" };

  it("dev y e2e solo siembran bases de desarrollo o de pruebas", () => {
    expect(seedTargetProblem("dev", local)).toBeNull();
    expect(seedTargetProblem("e2e", { ...local, databaseName: "BolikDigital_Test" })).toBeNull();
    expect(seedTargetProblem("dev", { ...local, databaseName: "BolikDigital_Stg" })).toContain(
      "BolikDigital_Stg",
    );
    expect(seedTargetProblem("dev", { ...local, databaseName: "BolikDigital" })).toContain(
      "--profile prod",
    );
  });

  it("dev y e2e nunca corren con APP_ENV staging o production", () => {
    expect(seedTargetProblem("dev", { ...local, appEnv: "staging" })).toContain("staging");
    expect(seedTargetProblem("e2e", { ...local, appEnv: "production" })).toContain("production");
  });

  it("prod puede sembrar cualquier base", () => {
    expect(
      seedTargetProblem("prod", { appEnv: "production", databaseName: "BolikDigital" }),
    ).toBeNull();
  });
});
