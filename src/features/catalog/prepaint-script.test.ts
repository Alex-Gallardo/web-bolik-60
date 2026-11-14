import { afterEach, describe, expect, it } from "vitest";
import { CATALOG_GRID_ID, catalogPrepaintScript } from "./prepaint-script";

const allowed = { linea: ["escritura", "arte"], uso: ["oficina"], color: ["azul"] };

function setup(search: string) {
  window.history.replaceState(null, "", `/productos${search}`);
  document.body.innerHTML = `<ul id="${CATALOG_GRID_ID}">
    <li data-product="a" data-linea="escritura" data-usos="oficina" data-colores="azul rojo">A</li>
    <li data-product="b" data-linea="arte" data-usos="" data-colores="">B</li>
  </ul>`;
  // El script en línea, tal como lo corre el navegador.
  new Function(catalogPrepaintScript(allowed))();
  return [...document.querySelectorAll<HTMLElement>("[data-product]")]
    .filter((li) => !li.hidden)
    .map((li) => li.dataset.product);
}

afterEach(() => {
  document.body.innerHTML = "";
  window.history.replaceState(null, "", "/");
});

describe("script previo al pintado del catálogo (BD-060)", () => {
  it("con un enlace filtrado oculta lo que no va, igual que matchesFilters", () => {
    expect(setup("?linea=arte")).toEqual(["b"]);
    expect(setup("?uso=oficina&color=azul")).toEqual(["a"]);
  });

  it("sin filtros o con valores desconocidos no toca nada", () => {
    expect(setup("")).toEqual(["a", "b"]);
    expect(setup("?linea=juguetes&utm_source=qr")).toEqual(["a", "b"]);
  });
});
