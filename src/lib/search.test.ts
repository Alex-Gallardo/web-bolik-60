// @vitest-environment node
import { beforeAll, describe, expect, it, vi } from "vitest";
import { searchSynonyms } from "@/content/search";
import { createSearcher, expandQuery, looksLikeCode, normalize, type SearchResult } from "./search";

vi.mock("next/cache", () => ({ cacheLife: () => {}, cacheTag: () => {} }));
vi.mock("@/env", () => ({ env: { DATA_SOURCE: "fixtures" } }));

// Contra el índice real de la fuente de ejemplo (el que sirve /api/search-index).
let search: (q: string) => SearchResult;
beforeAll(async () => {
  const { getSearchIndex } = await import("@/server/data/search");
  search = createSearcher(await getSearchIndex(), searchSynonyms);
});

const slugs = (r: SearchResult) => r.results.map((e) => e.slug);

describe("motor del buscador (BD-066)", () => {
  it("normaliza tildes, mayúsculas y espacios", () => {
    expect(normalize("  Crayón  JUMBO ")).toBe("crayon jumbo");
  });

  it("sinónimos: lapicero = bolígrafo, en las dos direcciones", () => {
    expect(expandQuery("Lapicero azul", searchSynonyms)).toEqual([
      "lapicero azul",
      "boligrafo azul",
    ]);
    expect(expandQuery("bolígrafos", searchSynonyms)).toEqual(["boligrafos", "lapiceros"]);
  });

  it("criterio: «ultra», «pt00058», «759364663092» y «crayon» encuentran resultados", () => {
    expect(slugs(search("ultra"))).toContain("bolik-ultra");
    expect(slugs(search("pt00058"))).toEqual(["bolik-ultra"]);
    expect(slugs(search("759364663092"))).toEqual(["bolik-ultra"]);
    expect(search("crayon").results.some((e) => /crayon/i.test(normalize(e.name)))).toBe(true);
  });

  it("un código exacto da la tarjeta «¿Buscas…?» con su color", () => {
    expect(search("PT-00059")).toMatchObject({
      status: "ok",
      exact: { sku: "PT00059", color: "Negro", entry: { slug: "bolik-ultra" } },
    });
  });

  it("solo un SKU o un código de barras real cuenta como código; «1966» se busca como texto", () => {
    for (const code of ["PT00058", "pt-00058", "759364663092", "75936466", "EJ-9999"])
      expect(looksLikeCode(code), code).toBe(true);
    for (const text of ["1966", "2026", "ultra", "x12", "123456789"])
      expect(looksLikeCode(text), text).toBe(false);
  });

  it("un código que no existe no trae parecidos", () => {
    expect(search("PT99999")).toEqual({ status: "empty", results: [] });
  });

  it("«lapicero» encuentra los bolígrafos aunque ningún producto diga lapicero", () => {
    expect(slugs(search("lapicero"))).toContain("bolik-ultra");
  });

  it("con tildes o sin ellas da lo mismo", () => {
    expect(slugs(search("crayón"))).toEqual(slugs(search("crayon")));
  });

  it("menos de 2 letras: aún no busca; algo sin parecido: vacío", () => {
    expect(search("u")).toEqual({ status: "short", results: [] });
    expect(search("zzqxw")).toEqual({ status: "empty", results: [] });
  });
});
