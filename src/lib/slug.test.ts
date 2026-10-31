// @vitest-environment node
import { describe, expect, it } from "vitest";
import { slugify } from "./slug";

describe("slugify", () => {
  it.each([
    ["Crayones de Cera Jumbo", "crayones-de-cera-jumbo"],
    ["Bolígrafos", "boligrafos"],
    ["Año escolar 2027", "ano-escolar-2027"],
    ["ÑANDÚ Lápiz", "nandu-lapiz"],
    ["  Bolik Ultra / 60 años!  ", "bolik-ultra-60-anos"],
    ["Sacatepéquez", "sacatepequez"],
    ["--ya--con--guiones--", "ya-con-guiones"],
  ])("%j → %j", (input, expected) => {
    expect(slugify(input)).toBe(expected);
  });

  it("devuelve vacío si no hay letras ni números", () => {
    expect(slugify("¡¿!?")).toBe("");
  });
});
