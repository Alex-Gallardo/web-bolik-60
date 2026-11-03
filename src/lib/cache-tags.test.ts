// @vitest-environment node
import { describe, expect, it } from "vitest";
import { productPaths, productTags, TAGS } from "./cache-tags";

describe("cache-tags", () => {
  it("arma tags con el formato entidad:slug", () => {
    expect(TAGS.product("bolik-ultra")).toBe("product:bolik-ultra");
    expect(TAGS.category("boligrafos")).toBe("category:boligrafos");
    expect(TAGS.department("guatemala")).toBe("department:guatemala");
  });

  it("un producto invalida su ficha, su categoría, listados, buscador, sitemap e IA", () => {
    expect(productTags("bolik-ultra", "boligrafos")).toEqual([
      "product:bolik-ultra",
      "category:boligrafos",
      TAGS.products,
      TAGS.searchIndex,
      TAGS.sitemap,
      TAGS.llms,
    ]);
  });

  it("da las rutas públicas del producto para IndexNow", () => {
    expect(productPaths("bolik-ultra", "boligrafos")).toEqual([
      "/productos/boligrafos/bolik-ultra",
      "/productos/boligrafos",
      "/productos",
    ]);
  });

  it("no repite nombres de tag", () => {
    const fixed = Object.values(TAGS).filter((t) => typeof t === "string");
    expect(new Set(fixed).size).toBe(fixed.length);
  });
});
