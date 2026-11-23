import { describe, expect, it } from "vitest";
import { imageAlt, withAlts } from "./product-images";

const fallback = { productName: "Bolik Ultra", colorName: "Azul", position: 2 };

describe("alt de las fotos de producto (BD-097, docs/10 §8)", () => {
  it("usa el alt de la foto", () => {
    expect(imageAlt("Bolik Ultra azul con la tapa puesta", "Otro", fallback)).toBe(
      "Bolik Ultra azul con la tapa puesta",
    );
  });

  it("si quedó vacío, el defaultAlt del medio", () => {
    expect(imageAlt("  ", "Punta del Bolik Ultra", fallback)).toBe("Punta del Bolik Ultra");
  });

  it("si tampoco hay, el texto de docs/17 con el producto, su color y la vista: nunca vacío", () => {
    expect(imageAlt("", null, fallback)).toBe("Bolik Ultra azul, vista 2");
    expect(imageAlt(null, " ", { ...fallback, colorName: null, position: 1 })).toBe(
      "Bolik Ultra, vista 1",
    );
  });
});

describe("fotos visibles con su alt (BD-097)", () => {
  const photo = (colorKey: string | null, alt: string, colorName: string | null) => ({
    src: `/media/products/bolik-ultra-${colorKey ?? "general"}-${alt || "x"}`,
    alt,
    defaultAlt: null,
    colorName,
    width: 960,
    height: 960,
    blurDataUrl: null,
    kind: "main" as const,
    colorKey,
  });

  it("un alt guardado que no describe nada («IMG_4521») también usa el respaldo", () => {
    expect(imageAlt("IMG_4521", "foto 1", fallback)).toBe("Bolik Ultra azul, vista 2");
  });

  it("«vista {n}» cuenta dentro de cada color, después de quitar los colores despublicados", () => {
    const images = withAlts(
      [
        photo("azul", "", "Azul"),
        photo("rojo", "", "Rojo"),
        photo("azul", "", "Azul"),
        photo("negro", "", "Negro"), // despublicado: no cuenta
        photo("rojo", "Punta del Bolik Ultra rojo", "Rojo"),
        photo("rojo", "", "Rojo"),
        photo(null, "", null),
      ],
      "Bolik Ultra",
      ["azul", "rojo"],
    );
    expect(images.map((i) => i.alt)).toEqual([
      "Bolik Ultra azul, vista 1",
      "Bolik Ultra rojo, vista 1",
      "Bolik Ultra azul, vista 2",
      "Punta del Bolik Ultra rojo",
      "Bolik Ultra rojo, vista 3",
      "Bolik Ultra, vista 1",
    ]);
    expect(images[0]).not.toHaveProperty("defaultAlt");
    expect(images[0]).not.toHaveProperty("colorName");
  });
});
