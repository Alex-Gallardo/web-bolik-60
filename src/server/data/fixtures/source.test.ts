// @vitest-environment node
import { describe, expect, it } from "vitest";
import { describeDataSourceContract } from "../contract";
import { fixturesSource } from "./source";

describeDataSourceContract("fuente de ejemplo (fixtures)", () => fixturesSource);

describe("fuente de ejemplo: productos de muestra", () => {
  it("marca los productos de ejemplo y les da códigos EJ-…", async () => {
    const products = await fixturesSource.listProducts();
    const samples = products.filter((p) => p.sample);
    expect(samples.length).toBeGreaterThan(0);
    expect(samples.every((p) => p.skus.every((sku) => sku.startsWith("EJ-")))).toBe(true);
    expect(products.filter((p) => !p.sample).map((p) => p.slug)).toEqual(["bolik-ultra"]);
  });

  it("muestra las actividades de ejemplo de la demo", async () => {
    const activities = await fixturesSource.listSchoolActivities();
    expect(activities).toHaveLength(4);
    expect(activities.every((a) => a.sample)).toBe(true);
  });

  it("cada categoría tiene al menos un producto para mostrar", async () => {
    const categories = await fixturesSource.listCategories();
    expect(categories.every((c) => c.productCount > 0)).toBe(true);
  });

  it("los relacionados del Bolik Ultra son productos visibles", async () => {
    const ultra = await fixturesSource.getProduct("boligrafos", "bolik-ultra");
    expect(ultra!.related.map((p) => p.slug)).toEqual([
      "bolik-ultra-fino",
      "fabik-pizarra",
      "lapiz-de-grafito-triangular",
    ]);
  });
});
