import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { FilterOptions } from "./catalog-filter-groups";
import { CatalogFilters } from "./catalog-filters";

const options: FilterOptions = {
  linea: [
    { slug: "escritura", name: "Escritura" },
    { slug: "arte", name: "Arte" },
  ],
  uso: [{ slug: "oficina", name: "Oficina" }],
  color: [{ slug: "azul", name: "Azul", hex: "tinta-azul" }],
};
const items = [
  { slug: "boligrafo", linea: "escritura", usos: ["oficina"], colores: ["azul"] },
  { slug: "crayon", linea: "arte", usos: [], colores: [] },
];
const empty = { title: "No hay productos con esos filtros", action: "Quitar filtros" };

function renderFilters() {
  return render(
    <CatalogFilters options={options} items={items} empty={empty}>
      <ul>
        <li data-product="boligrafo">Bolígrafo</li>
        <li>Banner que no es producto</li>
        <li data-product="crayon">Crayón</li>
      </ul>
    </CatalogFilters>,
  );
}

const shown = () =>
  [...document.querySelectorAll<HTMLElement>("[data-product]")]
    .filter((li) => !li.hidden)
    .map((li) => li.textContent);

beforeEach(() => window.history.replaceState(null, "", "/productos"));
afterEach(() => window.history.replaceState(null, "", "/"));

describe("CatalogFilters (BD-060)", () => {
  it("filtra la grilla del servidor, cuenta y escribe la URL", () => {
    renderFilters();
    expect(screen.getByText("2 productos")).toBeTruthy();
    // La barra de escritorio y el contador: un grupo por tipo de filtro.
    fireEvent.click(screen.getAllByRole("button", { name: /Arte/ })[0]!);
    expect(shown()).toEqual(["Crayón"]);
    expect(screen.getByText("1 producto")).toBeTruthy();
    expect(window.location.search).toBe("?linea=arte");
    expect(screen.getAllByRole("button", { name: /Arte/ })[0]!.getAttribute("aria-pressed")).toBe(
      "true",
    );
  });

  it("empareja por slug: un <li> que no es producto no desalinea nada", () => {
    renderFilters();
    fireEvent.click(screen.getAllByRole("button", { name: /Arte/ })[0]!);
    expect(shown()).toEqual(["Crayón"]);
    expect(screen.getByText("Banner que no es producto")).toBeTruthy();
  });

  it("sin resultados: estado vacío y «Quitar filtros» vuelve a mostrar todo", () => {
    renderFilters();
    fireEvent.click(screen.getAllByRole("button", { name: /Arte/ })[0]!);
    fireEvent.click(screen.getAllByRole("button", { name: /Azul/ })[0]!);
    expect(shown()).toEqual([]);
    expect(screen.getByText(empty.title)).toBeTruthy();
    // Dos «Quitar filtros»: el de la barra de móvil y el del estado vacío.
    fireEvent.click(screen.getAllByRole("button", { name: empty.action }).at(-1)!);
    expect(shown()).toEqual(["Bolígrafo", "Crayón"]);
    expect(window.location.search).toBe("");
    // El botón desapareció: el foco pasa al contador.
    expect(document.activeElement?.id).toBe("catalogo-contador");
  });

  it("un enlace compartido aplica sus filtros; un valor desconocido se ignora", () => {
    window.history.replaceState(null, "", "/productos?uso=oficina&linea=juguetes&utm_source=qr");
    renderFilters();
    expect(shown()).toEqual(["Bolígrafo"]);
    // Pulsar la opción activa la quita; el filtro desconocido se limpia y los demás parámetros quedan.
    act(() => {
      fireEvent.click(screen.getAllByRole("button", { name: /Oficina/ })[0]!);
    });
    expect(shown()).toEqual(["Bolígrafo", "Crayón"]);
    expect(window.location.search).toBe("?utm_source=qr");
  });

  it("la barra de filtros es .js-only (sin JS no se muestra) y los grupos tienen nombre", () => {
    renderFilters();
    expect(screen.getByRole("region", { name: "Filtrar productos" }).className).toContain(
      "js-only",
    );
    expect(screen.getAllByRole("group", { name: "Línea" }).length).toBeGreaterThan(0);
  });
});
