import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { feedback } from "@/content/feedback";
import { storesPage } from "@/content/stores";
import { StoreFilters } from "./store-filters";

const departments = [
  { slug: "guatemala", name: "Guatemala" },
  { slug: "quetzaltenango", name: "Quetzaltenango" },
];
// Izabal existe pero no tiene tiendas (llega desde el selector de la home).
const allDepartments = [...departments, { slug: "izabal", name: "Izabal" }];
const stores = [
  { slug: "walmart", department: "guatemala", name: "Walmart" },
  { slug: "abaco", department: "guatemala", name: "Librería Ábaco" },
  { slug: "tulan", department: "quetzaltenango", name: "Librería Tulán" },
];

function renderFilters() {
  return render(
    <StoreFilters
      departments={departments}
      allDepartments={allDepartments}
      stores={stores}
      prepaintScript=""
    >
      <div>
        {departments.map((d) => (
          <section key={d.slug} id={d.slug} data-store-group={d.slug}>
            <h2 id={`${d.slug}-titulo`} tabIndex={-1}>
              {d.name}
            </h2>
            <ul>
              {stores
                .filter((s) => s.department === d.slug)
                .map((s) => (
                  <li key={s.slug} data-store-item={s.slug}>
                    {s.name}
                  </li>
                ))}
            </ul>
          </section>
        ))}
      </div>
    </StoreFilters>,
  );
}

const shown = () =>
  [...document.querySelectorAll<HTMLElement>("[data-store-item]")]
    .filter((li) => !li.hidden)
    .map((li) => li.textContent);
const hiddenGroups = () =>
  [...document.querySelectorAll<HTMLElement>("[data-store-group]")]
    .filter((g) => g.hidden)
    .map((g) => g.dataset.storeGroup);
const events = () =>
  ((window as unknown as { dataLayer?: Record<string, unknown>[] }).dataLayer ?? []).filter(
    (e) => e.event === "store_filter",
  );

const scrollIntoView = vi.fn();
beforeEach(() => {
  scrollIntoView.mockReset();
  // jsdom no tiene scrollIntoView.
  Element.prototype.scrollIntoView = scrollIntoView;
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
    callback(0);
    return 0;
  });
  window.history.replaceState(null, "", "/donde-comprar");
  (window as unknown as { dataLayer?: unknown[] }).dataLayer = [];
});
afterEach(() => {
  vi.restoreAllMocks();
  window.history.replaceState(null, "", "/");
});

describe("StoreFilters (BD-080)", () => {
  it("sin filtro se ve todo, con el total", () => {
    renderFilters();
    expect(shown()).toEqual(["Walmart", "Librería Ábaco", "Librería Tulán"]);
    expect(screen.getByText("3 tiendas")).toBeTruthy();
  });

  it("el departamento filtra, oculta los demás grupos, escribe el hash y registra store_filter", () => {
    renderFilters();
    fireEvent.change(screen.getByLabelText(storesPage.filters.department), {
      target: { value: "quetzaltenango" },
    });
    expect(shown()).toEqual(["Librería Tulán"]);
    expect(hiddenGroups()).toEqual(["guatemala"]);
    expect(screen.getByText("1 tienda en Quetzaltenango")).toBeTruthy();
    expect(window.location.hash).toBe("#quetzaltenango");
    expect(events()).toEqual([{ event: "store_filter", department: "quetzaltenango" }]);

    fireEvent.change(screen.getByLabelText(storesPage.filters.department), {
      target: { value: "" },
    });
    expect(shown()).toHaveLength(3);
    expect(window.location.hash).toBe("");
    expect(events().at(-1)).toEqual({ event: "store_filter", department: "todos" });
  });

  it("toma el departamento del hash (formulario de la home) y de los enlaces por departamento", () => {
    window.history.replaceState(null, "", "/donde-comprar#guatemala");
    renderFilters();
    expect(shown()).toEqual(["Walmart", "Librería Ábaco"]);
    expect((screen.getByLabelText(storesPage.filters.department) as HTMLSelectElement).value).toBe(
      "guatemala",
    );

    act(() => {
      window.history.pushState(null, "", "/donde-comprar#quetzaltenango");
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });
    expect(shown()).toEqual(["Librería Tulán"]);
    // El grupo estaba oculto y el navegador no bajó: lo hace la isla, y el foco va a su título.
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(document.activeElement?.id).toBe("quetzaltenango-titulo");
    // Un enlace no es un cambio del selector: no cuenta como store_filter.
    expect(events()).toEqual([]);
  });

  it("un hash que no es un departamento de la página muestra todo", () => {
    window.history.replaceState(null, "", "/donde-comprar#contenido");
    renderFilters();
    expect(shown()).toHaveLength(3);
  });

  it("«Volver arriba» (#top) o «Saltar al contenido» no quitan el filtro", () => {
    window.history.replaceState(null, "", "/donde-comprar#quetzaltenango");
    renderFilters();
    for (const hash of ["#top", "#contenido"]) {
      act(() => {
        window.history.pushState(null, "", `/donde-comprar${hash}`);
        window.dispatchEvent(new HashChangeEvent("hashchange"));
      });
      expect(shown()).toEqual(["Librería Tulán"]);
    }
    // Atrás hasta la página sin hash: todos.
    act(() => {
      window.history.pushState(null, "", "/donde-comprar");
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });
    expect(shown()).toHaveLength(3);
  });

  it("un departamento sin tiendas (desde la home) deja todo a la vista con su aviso", () => {
    window.history.replaceState(null, "", "/donde-comprar#izabal");
    renderFilters();
    const none = feedback.stores.noneInDepartment("Izabal");
    expect(screen.getByText(none.title)).toBeTruthy();
    expect(screen.getByText(none.body)).toBeTruthy();
    expect(shown()).toHaveLength(3);
    expect((screen.getByLabelText(storesPage.filters.department) as HTMLSelectElement).value).toBe(
      "",
    );
    // Elegir un departamento con tiendas quita el aviso.
    fireEvent.change(screen.getByLabelText(storesPage.filters.department), {
      target: { value: "guatemala" },
    });
    expect(screen.queryByText(none.title)).toBeNull();
  });

  it("la búsqueda por nombre ignora tildes; sin resultados, el aviso amable", () => {
    renderFilters();
    const search = screen.getByLabelText(storesPage.filters.search);
    fireEvent.change(search, { target: { value: "abaco" } });
    expect(shown()).toEqual(["Librería Ábaco"]);
    expect(hiddenGroups()).toEqual(["quetzaltenango"]);
    fireEvent.change(search, { target: { value: "papelería" } });
    expect(shown()).toEqual([]);
    expect(screen.getByText(feedback.stores.filtersEmpty.title)).toBeTruthy();
    expect(screen.getByText("0 tiendas")).toBeTruthy();
  });

  it("«Quitar filtros» limpia la búsqueda y el departamento, y el foco pasa al conteo", () => {
    window.history.replaceState(null, "", "/donde-comprar#guatemala");
    renderFilters();
    fireEvent.change(screen.getByLabelText(storesPage.filters.search), {
      target: { value: "tulan" },
    });
    expect(shown()).toEqual([]);
    fireEvent.click(screen.getByRole("button", { name: feedback.stores.filtersEmpty.action }));
    expect(shown()).toHaveLength(3);
    expect((screen.getByLabelText(storesPage.filters.search) as HTMLInputElement).value).toBe("");
    expect(window.location.hash).toBe("");
    expect(document.activeElement?.textContent).toBe("3 tiendas");
  });
});
