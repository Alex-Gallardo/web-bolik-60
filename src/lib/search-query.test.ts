import { describe, expect, it } from "vitest";
import { MAX_QUERY_LENGTH, clampQuery, queryFromSegment, searchRewritePath } from "./search-query";

describe("consulta del buscador (BD-066)", () => {
  it("recorta espacios y largo sin partir caracteres", () => {
    expect(clampQuery("  ultra  ")).toBe("ultra");
    const long = `${"a".repeat(MAX_QUERY_LENGTH - 1)}🙂🙂`;
    const clamped = clampQuery(long);
    expect(Array.from(clamped)).toHaveLength(MAX_QUERY_LENGTH);
    expect(() => encodeURIComponent(clamped)).not.toThrow();
  });

  it("ida y vuelta por la ruta interna, también con puntos, barras y el prefijo", () => {
    for (const q of ["ultra", "..", "a/b", "-x", "crayón azul", "100%"]) {
      const segment = decodeURIComponent(searchRewritePath(q).slice("/buscar/".length));
      expect(queryFromSegment(segment)).toBe(q);
    }
    // Una dirección escrita a mano sin el prefijo también funciona.
    expect(queryFromSegment("ultra")).toBe("ultra");
  });
});
