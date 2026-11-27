import { describe, expect, it } from "vitest";
import type { StoreView } from "@/server/data/types";
import {
  departmentFromHash,
  isHttpsUrl,
  storePoint,
  toMapStore,
  toStoreJsonLd,
  groupStoresByDepartment,
  matchesStoreName,
  normalizeStoreSearch,
  sortStores,
  storesDepartmentRedirect,
  storesDepartmentTarget,
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

  it("?departamento= del formulario de la home va a la página del departamento, con las utm", () => {
    const go = (query: string) => storesDepartmentRedirect(new URLSearchParams(query));
    expect(go("departamento=quetzaltenango")).toBe("/donde-comprar/quetzaltenango");
    expect(go("departamento=Solola")).toBe("/donde-comprar/solola");
    expect(go("utm_source=x&departamento=solola")).toBe("/donde-comprar/solola?utm_source=x");
    expect(go("departamento=%20izabal%20")).toBe("/donde-comprar/izabal");
    // Sin página (sin tiendas): la lista con su aviso.
    const withPages = (query: string) =>
      storesDepartmentRedirect(new URLSearchParams(query), (slug) => slug !== "izabal");
    expect(withPages("departamento=izabal")).toBe("/donde-comprar#izabal");
    expect(withPages("utm_source=x&departamento=izabal")).toBe(
      "/donde-comprar?utm_source=x#izabal",
    );
    expect(withPages("departamento=solola")).toBe("/donde-comprar/solola");
    expect(go("departamento=")).toBe("/donde-comprar");
    expect(go("departamento=../admin")).toBe("/donde-comprar");
    expect(go("utm_source=x")).toBeNull();
  });

  it("solo el destino firme es permanente (308 con caché)", () => {
    const target = (query: string, page: boolean | null) =>
      storesDepartmentTarget(new URLSearchParams(query), () => page);
    expect(target("departamento=solola", true)).toEqual({
      location: "/donde-comprar/solola",
      permanent: true,
    });
    expect(target("departamento=izabal", false)).toEqual({
      location: "/donde-comprar#izabal",
      permanent: false,
    });
    expect(target("departamento=izabal", null)).toEqual({
      location: "/donde-comprar/izabal",
      permanent: false,
    });
    expect(target("departamento=", null)).toEqual({ location: "/donde-comprar", permanent: true });
    expect(target("utm_source=x", true)).toBeNull();
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

describe("datos de una tienda para el mapa y el JSON-LD (BD-081, BD-082)", () => {
  const verified: StoreView = {
    ...store("xela-centro", "libreria", XELA, "Librería Xela Centro"),
    municipality: "Quetzaltenango",
    address: "4a. calle 1-2",
    phone: "77651234",
    lat: 14.8346,
    lng: -91.5183,
    isVerified: true,
    onlineShopUrl: "https://tienda.example",
  };

  it("las coordenadas solo de una tienda verificada y con un punto válido", () => {
    expect(storePoint(verified)).toEqual({ lat: 14.8346, lng: -91.5183 });
    expect(storePoint({ ...verified, isVerified: false })).toBeNull();
    expect(storePoint({ ...verified, lng: null })).toBeNull();
    expect(storePoint({ ...verified, lat: 91 })).toBeNull();
  });

  it("toMapStore: slug, departamento, nombre y punto", () => {
    expect(toMapStore(verified)).toEqual({
      slug: "xela-centro",
      department: "quetzaltenango",
      name: "Librería Xela Centro",
      point: { lat: 14.8346, lng: -91.5183 },
    });
    expect(toMapStore({ ...verified, isVerified: false }).point).toBeNull();
  });

  it("toStoreJsonLd: la calle y geo solo verificadas; la tienda en línea solo https", () => {
    expect(toStoreJsonLd(verified, "GT")).toEqual({
      name: "Librería Xela Centro",
      address: "4a. calle 1-2",
      municipality: "Quetzaltenango",
      department: "Quetzaltenango",
      country: "GT",
      phone: "77651234",
      geo: { lat: 14.8346, lng: -91.5183 },
      url: "https://tienda.example",
    });
    const unverified = toStoreJsonLd(
      { ...verified, isVerified: false, onlineShopUrl: "javascript:alert(1)" },
      null,
    );
    expect(unverified).toMatchObject({ address: null, geo: null, url: null, country: null });
  });

  it("isHttpsUrl", () => {
    expect(isHttpsUrl("https://www.walmart.com.gt")).toBe(true);
    expect(isHttpsUrl("http://x.com")).toBe(false);
    expect(isHttpsUrl("javascript:alert(1)")).toBe(false);
    expect(isHttpsUrl(null)).toBe(false);
  });
});
