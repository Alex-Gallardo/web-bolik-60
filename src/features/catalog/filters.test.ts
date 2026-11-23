import { describe, expect, it } from "vitest";
import {
  activeFilterCount,
  filtersToSearch,
  matchesFilters,
  parseFilters,
  toggleFilter,
} from "./filters";

const allowed = {
  linea: ["escritura", "escolar"],
  uso: ["escolar", "oficina"],
  color: ["azul", "rojo"],
};

describe("filtros del catálogo (BD-060)", () => {
  it("lee de la URL solo claves conocidas con valores que existen", () => {
    expect(parseFilters("?linea=escolar&uso=oficina&color=azul", allowed)).toEqual({
      linea: "escolar",
      uso: "oficina",
      color: "azul",
    });
    // Un valor inexistente, inválido o una clave desconocida no vacían la grilla.
    expect(parseFilters("?linea=juguetes&uso=Ofi%20cina&marca=x", allowed)).toEqual({});
  });

  it("escribe la query en orden fijo y conserva los demás parámetros", () => {
    expect(filtersToSearch({ color: "rojo", linea: "escolar" })).toBe("?linea=escolar&color=rojo");
    expect(filtersToSearch({ uso: "oficina" }, "?utm_source=qr&linea=escolar")).toBe(
      "?uso=oficina&utm_source=qr",
    );
    expect(filtersToSearch({})).toBe("");
  });

  it("combina los grupos con «y»", () => {
    const item = { linea: "escritura", usos: ["escolar", "oficina"], colores: ["azul", "rojo"] };
    expect(matchesFilters(item, {})).toBe(true);
    expect(matchesFilters(item, { linea: "escritura", uso: "oficina", color: "rojo" })).toBe(true);
    expect(matchesFilters(item, { linea: "escolar" })).toBe(false);
    expect(matchesFilters(item, { uso: "promocional" })).toBe(false);
    expect(matchesFilters(item, { color: "verde" })).toBe(false);
  });

  it("pulsar la opción activa la quita; otra la cambia", () => {
    expect(toggleFilter({}, "linea", "escolar")).toEqual({ linea: "escolar" });
    expect(toggleFilter({ linea: "escolar" }, "linea", "escolar")).toEqual({});
    expect(toggleFilter({ linea: "escolar" }, "linea", "arte")).toEqual({ linea: "arte" });
    expect(activeFilterCount({ linea: "a", color: "b" })).toBe(2);
  });
});
