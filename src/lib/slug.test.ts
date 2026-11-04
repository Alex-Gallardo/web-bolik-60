// @vitest-environment node
import { describe, expect, it } from "vitest";
import { safeSlug, slugify } from "./slug";

describe("safeSlug", () => {
  it("deja pasar slugs válidos", () => {
    expect(safeSlug("boligrafos")).toBe("boligrafos");
    expect(safeSlug("bolik-ultra")).toBe("bolik-ultra");
  });

  it("rechaza lo que no podría ser un slug", () => {
    for (const value of [
      undefined,
      "",
      "Bolik",
      "bolik_ultra",
      "-x",
      "x-",
      "a--b",
      "ñu",
      "a".repeat(101),
    ])
      expect(safeSlug(value), String(value)).toBeUndefined();
  });
});

describe("slugify", () => {
  it.each([
    ["Crayones de Cera Jumbo", "crayones-de-cera-jumbo"],
    ["Bolígrafos", "boligrafos"],
    ["Año escolar 2027", "ano-escolar-2027"],
    ["ÑANDÚ Lápiz", "nandu-lapiz"],
    ["  Bolik Ultra / 60 años!  ", "bolik-ultra-60-anos"],
    ["Sacatepéquez", "sacatepequez"],
    ["--ya--con--guiones--", "ya-con-guiones"],
    ["Kid's Art", "kids-art"],
    ["D’Colores", "dcolores"],
    ["Pingüino", "pinguino"],
    ["Papel 75 g/m²", "papel-75-g-m2"],
  ])("%j → %j", (input, expected) => {
    expect(slugify(input)).toBe(expected);
  });

  it("devuelve vacío si no hay letras ni números", () => {
    expect(slugify("¡¿!?")).toBe("");
  });
});
