// @vitest-environment node
import { describe, expect, it } from "vitest";
import { rawSeedData } from "./data";
import { seedDataSchema } from "./schema";

/** Una copia de los JSON del seed para alterarla sin tocar la original. */
const copy = () => structuredClone(rawSeedData) as Record<string, unknown> & typeof rawSeedData;

const problems = (data: unknown) =>
  seedDataSchema.safeParse(data).error?.issues.map((issue) => issue.message) ?? [];

describe("fotos del seed (BD-097, docs/10 §8)", () => {
  it("los JSON actuales cumplen: alt descriptivo y claves desde el slug", () => {
    expect(problems(rawSeedData)).toEqual([]);
  });

  it("un alt que es nombre de archivo o «foto 1» no pasa", () => {
    const data = copy();
    (data.media as { alt: string }[])[0]!.alt = "IMG_4521.jpg";
    (data.media as { alt: string }[])[1]!.alt = "foto 1";
    expect(problems(data).filter((m) => /texto alternativo/.test(m))).toHaveLength(2);
  });

  it("una foto de producto cuya clave no empieza con el slug del producto no pasa", () => {
    const data = copy();
    const products = data.products as { slug: string; images: { mediaKey: string }[] }[];
    const ultra = products.find((p) => p.slug === "bolik-ultra")!;
    const fino = products.find((p) => p.slug === "bolik-ultra-fino")!;
    // Clave válida en media.json, pero de otro producto.
    ultra.images[0]!.mediaKey = fino.images[0]!.mediaKey;
    expect(problems(data)).toContain(
      `la foto ${fino.images[0]!.mediaKey} debe empezar con products/bolik-ultra-`,
    );
  });
});
