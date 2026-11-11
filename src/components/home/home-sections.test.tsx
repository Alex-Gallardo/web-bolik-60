import { cleanup, render, screen, within } from "@testing-library/react";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { audiences } from "@/content/home";
import type { CategoryView } from "@/server/data/types";
import { CatalogSection } from "./catalog-section";
import { SolutionsSection } from "./solutions-section";

// Section lee la apariencia de la BD: aquí sin registro (queda el fondo del código).
const { getSectionAppearance } = vi.hoisted(() => ({ getSectionAppearance: vi.fn() }));
vi.mock("@/server/data/content", () => ({ getSectionAppearance }));

beforeEach(() => {
  getSectionAppearance.mockReset();
  getSectionAppearance.mockResolvedValue(null);
});

/**
 * Las secciones devuelven <Section> (async, Server Component) como raíz: se llama a la sección,
 * después a Section, y se renderiza lo que resuelve.
 */
async function renderAsync(element: ReactElement) {
  const tree = element.type as (props: unknown) => ReactElement;
  const resolved = tree(element.props);
  const section = resolved.type as (props: unknown) => Promise<ReactElement>;
  render(await section(resolved.props));
}

const category = (slug: string, lineGroup: CategoryView["lineGroup"]): CategoryView =>
  ({
    slug,
    name: `Categoría ${slug}`,
    href: `/productos/${slug}`,
    lineGroup,
    shortText: "Texto corto.",
    productCount: 2,
  }) as CategoryView;

describe("SolutionsSection (BD-051)", () => {
  it("un h2 y una tarjeta por público, con su ruta, revelado y evento", async () => {
    await renderAsync(<SolutionsSection />);
    expect(screen.getByRole("heading", { level: 2 }).textContent).toBe("Un Bolik para cada etapa");
    const section = screen.getByRole("region", { name: "Un Bolik para cada etapa" });
    expect(section.dataset.bg).toBe("paper");
    const items = within(section).getAllByRole("listitem");
    expect(items).toHaveLength(audiences.length);
    for (const [index, audience] of audiences.entries()) {
      const link = within(items[index]!).getByRole("link");
      expect(link.getAttribute("href")).toBe(audience.href);
      expect(link.getAttribute("data-event")).toBe("solution_click");
      expect(within(link).getByRole("heading", { level: 3 }).textContent).toBe(audience.title);
      expect(items[index]!.hasAttribute("data-reveal")).toBe(true);
      // Escalonado solo desde lg: --n lleva el turno y la clase lo pasa a --i.
      expect(items[index]!.style.getPropertyValue("--n")).toBe(String(index));
      expect(link.getAttribute("data-audience")).toBe(audience.key);
    }
    expect(getSectionAppearance).toHaveBeenCalledWith("home.solutions");
  });
});

describe("CatalogSection (BD-051)", () => {
  const categories = [
    category("boligrafos", "escritura"),
    category("crayones", "escolar"),
    category("marcadores", "escritura"),
  ];

  it("buscador GET a /buscar con etiqueta real, chips de las líneas con categorías y tarjetas", async () => {
    await renderAsync(<CatalogSection categories={categories} productCount={null} />);
    const section = screen.getByRole("region", { name: "Encuentra lo que necesitas" });
    expect(section.dataset.bg).toBe("soft");

    const search = within(section).getByRole("search");
    expect(search.getAttribute("action")).toBe("/buscar");
    expect(search.getAttribute("method")).toBe("get");
    const input = within(search).getByRole("searchbox", { name: "Buscar en el catálogo" });
    expect(input.getAttribute("name")).toBe("q");

    // Solo las líneas que tienen categorías, en el orden de LINE_GROUPS.
    const lines = within(section).getByRole("list", { name: "Líneas de producto" });
    expect(
      within(lines)
        .getAllByRole("link")
        .map((a) => [a.textContent, a.getAttribute("href")]),
    ).toEqual([
      ["Escritura", "/productos?linea=escritura"],
      ["Escolar", "/productos?linea=escolar"],
    ]);

    const cards = within(section).getAllByRole("heading", { level: 3 });
    expect(cards.map((h) => h.textContent)).toEqual(categories.map((c) => c.name));
    const card = cards[0]!.closest("a")!;
    expect(card.getAttribute("href")).toBe("/productos/boligrafos");
    expect(card.getAttribute("data-event")).toBe("category_click");
    expect(card.parentElement!.hasAttribute("data-reveal")).toBe(true);

    expect(
      within(section).getByRole("link", { name: "Ver todo el catálogo" }).getAttribute("href"),
    ).toBe("/productos");
  });

  it("sin categorías no dibuja chips ni grilla vacíos", async () => {
    await renderAsync(<CatalogSection categories={[]} productCount={null} />);
    expect(screen.queryByRole("list")).toBeNull();
    expect(screen.getByRole("searchbox")).toBeTruthy();
  });

  it("solo dice cuántos productos hay si la cifra está publicada", async () => {
    await renderAsync(<CatalogSection categories={categories} productCount={null} />);
    expect(screen.getByText("Útiles para la escuela, la oficina y la casa.")).toBeTruthy();
    cleanup();
    await renderAsync(<CatalogSection categories={categories} productCount={1500} />);
    expect(
      screen.getByText("Más de 1,500 útiles para la escuela, la oficina y la casa."),
    ).toBeTruthy();
  });
});
