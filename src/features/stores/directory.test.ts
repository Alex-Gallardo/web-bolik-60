import { describe, expect, it } from "vitest";
import type { StoreView } from "@/server/data/types";
import {
  departmentFromHash,
  groupStoresByDepartment,
  matchesStoreName,
  normalizeStoreSearch,
  sortStores,
  storesDepartmentRedirect,
} from "./directory";
import { STORES_LIST_ID, storesPrepaintScript } from "./prepaint-script";

const GUATE = { slug: "guatemala", name: "Guatemala" };
const XELA = { slug: "quetzaltenango", name: "Quetzaltenango" };

const store = (
  slug: string,
  type: StoreView["type"],
  department = GUATE,
  name = slug,
): StoreView => ({
  slug,
  name,
  type,
  department,
  municipality: null,
  address: null,
  phone: null,
  websiteUrl: null,
  onlineShopUrl: null,
  lat: null,
  lng: null,
  isVerified: false,
});

describe("lista de tiendas (BD-080)", () => {
  it("ordena cadenas, librerías y distribuidores; dentro de cada tipo, por nombre", () => {
    const sorted = sortStores([
      store("d", "distribuidor", GUATE, "Distribuidora Sur"),
      store("l2", "libreria", GUATE, "Útiles Zeta"),
      store("c", "cadena", GUATE, "Walmart"),
      store("l1", "libreria", GUATE, "Librería Ábaco"),
    ]);
    expect(sorted.map((s) => s.slug)).toEqual(["c", "l1", "l2", "d"]);
  });

  it("agrupa en el orden de los departamentos y omite los que no tienen tiendas", () => {
    const groups = groupStoresByDepartment(
      [store("x", "libreria", XELA), store("w", "cadena"), store("g", "libreria")],
      [GUATE, { slug: "solola", name: "Sololá" }, XELA],
    );
    expect(groups.map((g) => [g.department.slug, g.stores.map((s) => s.slug)])).toEqual([
      ["guatemala", ["w", "g"]],
      ["quetzaltenango", ["x"]],
    ]);
  });

  it("una tienda de un departamento que no viene en la lista no se pierde", () => {
    const groups = groupStoresByDepartment([store("x", "libreria", XELA)], [GUATE]);
    expect(groups).toEqual([{ department: XELA, stores: [store("x", "libreria", XELA)] }]);
  });

  it("busca por nombre sin tildes, mayúsculas ni espacios de más", () => {
    expect(normalizeStoreSearch("  Librería   ÑANDÚ ")).toBe("libreria nandu");
    const name = normalizeStoreSearch("Librería Ñandú");
    expect(matchesStoreName(name, normalizeStoreSearch("NANDU"))).toBe(true);
    expect(matchesStoreName(name, normalizeStoreSearch("libreria  nan"))).toBe(true);
    expect(matchesStoreName(name, "")).toBe(true);
    expect(matchesStoreName(name, "walmart")).toBe(false);
  });

  it("el departamento del hash solo si es un slug con grupo en la página", () => {
    const allowed = ["guatemala", "quetzaltenango"];
    expect(departmentFromHash("#quetzaltenango", allowed)).toBe("quetzaltenango");
    expect(departmentFromHash("quetzaltenango", allowed)).toBe("quetzaltenango");
    expect(departmentFromHash("#solola", allowed)).toBeUndefined();
    expect(departmentFromHash("#<script>", allowed)).toBeUndefined();
    expect(departmentFromHash("#%E0%A4%A", allowed)).toBeUndefined();
    expect(departmentFromHash("", allowed)).toBeUndefined();
  });

  it("?departamento= del formulario de la home va al grupo, con las demás utm", () => {
    const go = (query: string) => storesDepartmentRedirect(new URLSearchParams(query));
    expect(go("departamento=quetzaltenango")).toBe("/donde-comprar#quetzaltenango");
    expect(go("departamento=Solola")).toBe("/donde-comprar#solola");
    expect(go("utm_source=x&departamento=solola")).toBe("/donde-comprar?utm_source=x#solola");
    expect(go("departamento=")).toBe("/donde-comprar");
    expect(go("departamento=../admin")).toBe("/donde-comprar");
    expect(go("utm_source=x")).toBeNull();
  });
});

describe("script previo al pintado de /donde-comprar (BD-080)", () => {
  function setup(hash: string) {
    document.body.innerHTML = `<div id="${STORES_LIST_ID}">
      <section data-store-group="guatemala"></section>
      <section data-store-group="quetzaltenango"></section>
    </div>`;
    window.history.replaceState(null, "", `/donde-comprar${hash}`);
    new Function(storesPrepaintScript(["guatemala", "quetzaltenango"]))();
    return [...document.querySelectorAll<HTMLElement>("[data-store-group]")].map((g) => g.hidden);
  }

  it("con #departamento oculta los demás grupos antes de pintar", () => {
    expect(setup("#quetzaltenango")).toEqual([true, false]);
  });

  it("sin hash, o con uno que no es un departamento de la página, se ve todo", () => {
    expect(setup("")).toEqual([false, false]);
    expect(setup("#solola")).toEqual([false, false]);
    // Mal codificado: decodeURIComponent falla y el try lo deja todo a la vista.
    expect(setup("#%E0%A4%A")).toEqual([false, false]);
  });
});
