import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { feedback } from "@/content/feedback";
import { storesPage } from "@/content/stores";
import type { MapStore } from "@/features/stores/nearby";
import { StoreFilters } from "./store-filters";

const toasts = vi.hoisted(() => [] as { title: string; id?: string }[]);
vi.mock("@/components/feedback/feedback-store", () => ({
  showToast: vi.fn(async (message: { title: string }, options?: { id?: string }) => {
    toasts.push({ title: message.title, id: options?.id });
  }),
}));
// El mapa (Leaflet) se prueba en E2E: aquí solo se revisa qué recibe.
const mapProps = vi.hoisted(() => [] as { selected?: string; departments: unknown[] }[]);
vi.mock("./store-map-slot", () => ({
  StoreMapSlot: (props: { selected?: string; departments: unknown[] }) => {
    mapProps.push(props);
    return null;
  },
  StoreMap: () => null,
}));

const departments = [
  { slug: "guatemala", name: "Guatemala", lat: 14.6349, lng: -90.5069, storeCount: 2 },
  { slug: "quetzaltenango", name: "Quetzaltenango", lat: 14.8347, lng: -91.5181, storeCount: 1 },
];
// Izabal existe pero no tiene tiendas (llega desde el selector de la home).
const allDepartments = [
  ...departments.map(({ slug, name }) => ({ slug, name })),
  { slug: "izabal", name: "Izabal" },
];
const baseStores: MapStore[] = [
  { slug: "walmart", department: "guatemala", name: "Walmart", point: null },
  { slug: "abaco", department: "guatemala", name: "Librería Ábaco", point: null },
  { slug: "tulan", department: "quetzaltenango", name: "Librería Tulán", point: null },
];

function renderFilters(stores: MapStore[] = baseStores) {
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
  toasts.length = 0;
  mapProps.length = 0;
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

type GeoSuccess = (position: { coords: { latitude: number; longitude: number } }) => void;
type GeoError = (error: { code: number; PERMISSION_DENIED: number }) => void;

/** navigator.geolocation simulado: la prueba decide la respuesta. */
function mockGeolocation() {
  const calls: { ok: GeoSuccess; fail: GeoError; options?: PositionOptions }[] = [];
  Object.defineProperty(navigator, "geolocation", {
    configurable: true,
    value: {
      getCurrentPosition: (ok: GeoSuccess, fail: GeoError, options?: PositionOptions) =>
        calls.push({ ok, fail, options }),
    },
  });
  return calls;
}

const locateEvents = () =>
  ((window as unknown as { dataLayer?: Record<string, unknown>[] }).dataLayer ?? []).filter(
    (e) => e.event === "store_locate",
  );
const locateButton = () => screen.getByRole("button", { name: storesPage.locate });
const departmentSelect = () =>
  screen.getByLabelText(storesPage.filters.department) as HTMLSelectElement;

describe("StoreFilters: Usar mi ubicación (BD-081)", () => {
  // El módulo de cercanía se descarga al tocar el botón: ya cargado, su import() resuelve enseguida.
  beforeAll(async () => {
    await import("@/features/stores/nearby");
  });

  afterEach(() => {
    Reflect.deleteProperty(navigator, "geolocation");
  });

  it("elige el departamento más cercano, avisa cuántas tiendas hay y registra store_locate", async () => {
    const calls = mockGeolocation();
    renderFilters();
    fireEvent.click(locateButton());
    expect(toasts).toEqual([{ title: feedback.stores.locating.title, id: "store-locate" }]);
    expect(locateButton().getAttribute("aria-busy")).toBe("true");
    expect(calls[0]?.options).toMatchObject({ enableHighAccuracy: false, timeout: 10_000 });

    // Parque central de Xela.
    await act(async () => calls[0]!.ok({ coords: { latitude: 14.8344, longitude: -91.5186 } }));
    expect(shown()).toEqual(["Librería Tulán"]);
    expect(departmentSelect().value).toBe("quetzaltenango");
    expect(window.location.hash).toBe("#quetzaltenango");
    expect(toasts.at(-1)).toEqual({ title: "Encontramos 1 tienda cerca", id: "store-locate" });
    expect(locateButton().getAttribute("aria-busy")).toBeNull();
    // La posición no va al dataLayer: solo el resultado y el departamento.
    expect(locateEvents()).toEqual([
      { event: "store_locate", result: "ok", department: "quetzaltenango" },
    ]);
    // El mapa recibe el mismo departamento.
    expect(mapProps.at(-1)?.selected).toBe("quetzaltenango");
  });

  it("ordena por distancia las tiendas verificadas del departamento", async () => {
    const calls = mockGeolocation();
    renderFilters([
      { slug: "lejos", department: "guatemala", name: "Lejos", point: { lat: 14.7, lng: -90.4 } },
      { slug: "sin", department: "guatemala", name: "Sin coordenadas", point: null },
      { slug: "cerca", department: "guatemala", name: "Cerca", point: { lat: 14.63, lng: -90.5 } },
      { slug: "tulan", department: "quetzaltenango", name: "Librería Tulán", point: null },
    ]);
    fireEvent.click(locateButton());
    await act(async () => calls[0]!.ok({ coords: { latitude: 14.6349, longitude: -90.5069 } }));
    expect(shown()).toEqual(["Cerca", "Lejos", "Sin coordenadas"]);
  });

  it("permiso denegado: el aviso amable y el foco en el selector de departamento", async () => {
    const calls = mockGeolocation();
    renderFilters();
    fireEvent.click(locateButton());
    act(() => calls[0]!.fail({ code: 1, PERMISSION_DENIED: 1 }));
    expect(toasts.at(-1)).toEqual({
      title: feedback.stores.locationDenied.title,
      id: "store-locate",
    });
    expect(document.activeElement).toBe(departmentSelect());
    expect(shown()).toHaveLength(3);
    expect(locateEvents()).toEqual([{ event: "store_locate", result: "denegado" }]);
  });

  it("si falla (sin señal, tiempo agotado), el mismo aviso", async () => {
    const calls = mockGeolocation();
    renderFilters();
    fireEvent.click(locateButton());
    act(() => calls[0]!.fail({ code: 3, PERMISSION_DENIED: 1 }));
    expect(toasts.at(-1)?.title).toBe(feedback.stores.locationDenied.title);
    expect(locateEvents()).toEqual([{ event: "store_locate", result: "error" }]);
  });

  it("una posición inválida cuenta como error", async () => {
    const calls = mockGeolocation();
    renderFilters();
    fireEvent.click(locateButton());
    await act(async () => calls[0]!.ok({ coords: { latitude: Number.NaN, longitude: 0 } }));
    expect(toasts.at(-1)?.title).toBe(feedback.stores.locationDenied.title);
    expect(document.activeElement).toBe(departmentSelect());
  });

  it("lejos de todas las tiendas: «No encontramos tiendas cerca de ti» y el selector", async () => {
    const calls = mockGeolocation();
    renderFilters();
    fireEvent.click(locateButton());
    // Ciudad de México.
    await act(async () => calls[0]!.ok({ coords: { latitude: 19.4326, longitude: -99.1332 } }));
    expect(toasts.at(-1)?.title).toBe(feedback.stores.noneNearby.title);
    expect(document.activeElement).toBe(departmentSelect());
    expect(shown()).toHaveLength(3);
    expect(locateEvents()).toEqual([{ event: "store_locate", result: "lejos" }]);
  });

  it("sin geolocalización en el navegador: el aviso, sin pedir nada", () => {
    renderFilters();
    fireEvent.click(locateButton());
    expect(toasts).toEqual([{ title: feedback.stores.locationDenied.title, id: "store-locate" }]);
    expect(locateEvents()).toEqual([{ event: "store_locate", result: "sin-soporte" }]);
  });

  it("un segundo clic mientras busca no vuelve a pedir la posición", async () => {
    const calls = mockGeolocation();
    renderFilters();
    fireEvent.click(locateButton());
    fireEvent.click(locateButton());
    expect(calls).toHaveLength(1);
  });

  it("sin respuesta en 20 s (aviso del permiso cerrado): se da por fallido y se puede reintentar", async () => {
    vi.useFakeTimers();
    try {
      const calls = mockGeolocation();
      renderFilters();
      fireEvent.click(locateButton());
      act(() => {
        vi.advanceTimersByTime(20_000);
      });
      expect(toasts.at(-1)?.title).toBe(feedback.stores.locationDenied.title);
      expect(document.activeElement).toBe(departmentSelect());
      expect(locateEvents()).toEqual([{ event: "store_locate", result: "error" }]);
      // Una respuesta tardía del intento viejo no cambia nada.
      await act(async () => calls[0]!.ok({ coords: { latitude: 14.8344, longitude: -91.5186 } }));
      expect(shown()).toHaveLength(3);
      // Se puede volver a intentar.
      fireEvent.click(locateButton());
      expect(calls).toHaveLength(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("al cambiar de departamento, las tiendas vuelven a su orden", async () => {
    const calls = mockGeolocation();
    renderFilters([
      { slug: "lejos", department: "guatemala", name: "Lejos", point: { lat: 14.7, lng: -90.4 } },
      { slug: "cerca", department: "guatemala", name: "Cerca", point: { lat: 14.63, lng: -90.5 } },
      { slug: "tulan", department: "quetzaltenango", name: "Librería Tulán", point: null },
    ]);
    fireEvent.click(locateButton());
    await act(async () => calls[0]!.ok({ coords: { latitude: 14.6349, longitude: -90.5069 } }));
    expect(shown()).toEqual(["Cerca", "Lejos"]);
    fireEvent.change(departmentSelect(), { target: { value: "" } });
    expect(shown()).toEqual(["Lejos", "Cerca", "Librería Tulán"]);
  });

  it("el mapa recibe solo departamentos con coordenadas y sigue al selector", () => {
    render(
      <StoreFilters
        departments={[
          ...departments,
          { slug: "x", name: "X", lat: Number.NaN, lng: 0, storeCount: 1 },
        ]}
        allDepartments={allDepartments}
        stores={baseStores}
        prepaintScript=""
      >
        <div />
      </StoreFilters>,
    );
    expect(mapProps.at(-1)?.departments).toHaveLength(2);
    fireEvent.change(departmentSelect(), { target: { value: "guatemala" } });
    expect(mapProps.at(-1)?.selected).toBe("guatemala");
  });
});

describe("StoreFilters: Ver mapa en móvil (BD-081)", () => {
  it("abre la hoja del mapa y, al cerrarla, el foco vuelve al botón", async () => {
    renderFilters();
    const open = screen.getByRole("button", { name: storesPage.map.open });
    fireEvent.click(open);
    const sheet = await screen.findByRole(
      "dialog",
      { name: storesPage.map.title },
      { timeout: 5000 },
    );
    expect(toasts).toEqual([]);
    expect(sheet).toBeTruthy();
    fireEvent.keyDown(sheet, { key: "Escape" });
    await vi.waitFor(() => expect(document.activeElement).toBe(open));
  });
});
