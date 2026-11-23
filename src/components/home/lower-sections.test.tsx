import { render, screen, within } from "@testing-library/react";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  DepartmentView,
  MilestoneView,
  SchoolActivityView,
  StoreView,
} from "@/server/data/types";
import { HistorySection } from "./history-section";
import { SchoolsSection } from "./schools-section";
import { WhereToBuySection } from "./where-to-buy-section";
import { WholesaleSection } from "./wholesale-section";

// Section lee la apariencia de la BD: aquí sin registro (queda el fondo del código).
const { getSectionAppearance } = vi.hoisted(() => ({ getSectionAppearance: vi.fn() }));
vi.mock("@/server/data/content", () => ({ getSectionAppearance }));

beforeEach(() => {
  getSectionAppearance.mockReset();
  getSectionAppearance.mockResolvedValue(null);
});

/** La sección devuelve <Section> (async) como raíz: se resuelve antes de renderizar. */
async function renderAsync(element: ReactElement) {
  const tree = element.type as (props: unknown) => ReactElement;
  const resolved = tree(element.props);
  const section = resolved.type as (props: unknown) => Promise<ReactElement>;
  return render(await section(resolved.props));
}

const activity = (key: string, colorKey: SchoolActivityView["colorKey"]) =>
  ({
    key,
    title: `Actividad ${key}`,
    description: "Texto.",
    colorKey,
    iconKey: "x",
    sample: true,
  }) as SchoolActivityView;

describe("SchoolsSection (BD-053)", () => {
  it("fondo sun, actividades inclinadas con texto AA y el botón a /escuelas", async () => {
    await renderAsync(
      <SchoolsSection activities={[activity("a", "coral"), activity("b", "kblue")]} />,
    );
    const section = screen.getByRole("region", { name: "Bolik en tu escuela" });
    expect(section.dataset.bg).toBe("sun");
    const cards = within(section).getAllByRole("article");
    // A-40: ±1.5° alternados con .kids-tilt.
    expect(cards[0]!.classList.contains("kids-tilt")).toBe(true);
    expect(cards[0]!.style.getPropertyValue("--tilt")).toBe("-1.5deg");
    expect(cards[1]!.style.getPropertyValue("--tilt")).toBe("1.5deg");
    // Azul de escuelas con texto blanco; coral con tinta.
    expect(cards[1]!.className).toContain("text-paper");
    expect(cards[0]!.className).toContain("text-ink");
    expect(
      within(section).getByRole("link", { name: "Lleva Bolik a tu escuela" }).getAttribute("href"),
    ).toBe("/escuelas");
  });

  it("sin actividades (producción, sin los ejemplos) quedan el texto y el botón", async () => {
    await renderAsync(<SchoolsSection activities={[]} />);
    expect(screen.queryByRole("list")).toBeNull();
    expect(screen.getByRole("link", { name: "Lleva Bolik a tu escuela" })).toBeTruthy();
  });
});

describe("WholesaleSection (BD-053)", () => {
  it("dos tarjetas con los textos de docs/17 y sus rutas", async () => {
    await renderAsync(<WholesaleSection />);
    const section = screen.getByRole("region", { name: "Mayoreo y empresas" });
    expect(
      within(section)
        .getAllByRole("heading", { level: 3 })
        .map((h) => h.textContent),
    ).toEqual(["Compra directo de fábrica.", "Tu logo, en manos de todos."]);
    expect(
      within(section).getByRole("link", { name: "Cotizar por mayor" }).getAttribute("href"),
    ).toBe("/mayoreo");
    expect(
      within(section).getByRole("link", { name: "Cotizar personalizados" }).getAttribute("href"),
    ).toBe("/empresas");
  });
});

describe("WhereToBuySection (BD-053)", () => {
  const departments = [
    { slug: "guatemala", name: "Guatemala" },
    { slug: "quetzaltenango", name: "Quetzaltenango" },
  ] as DepartmentView[];
  const stores = [
    { slug: "walmart", name: "Walmart", onlineShopUrl: "https://www.walmart.com.gt" },
    { slug: "sin-url", name: "Sin URL", onlineShopUrl: null },
  ] as StoreView[];

  it("selector GET a /donde-comprar con etiqueta real y un <option> por departamento", async () => {
    await renderAsync(<WhereToBuySection departments={departments} onlineStores={stores} />);
    const select = screen.getByRole("combobox", { name: "Elige tu departamento" });
    expect(select.getAttribute("name")).toBe("departamento");
    expect(
      within(select)
        .getAllByRole("option")
        .map((o) => o.getAttribute("value")),
    ).toEqual(["guatemala", "quetzaltenango"]);
    const form = select.closest("form")!;
    expect(form.getAttribute("action")).toBe("/donde-comprar");
    expect(form.getAttribute("method")).toBe("get");
  });

  it("una URL que no es https no da botón", async () => {
    await renderAsync(
      <WhereToBuySection
        departments={departments}
        onlineStores={[{ slug: "x", name: "X", onlineShopUrl: "javascript:alert(1)" } as StoreView]}
      />,
    );
    expect(screen.queryByRole("link", { name: /Comprar en X/ })).toBeNull();
  });

  it("compra en línea: enlace externo en otra pestaña, rel noopener y retailer_click", async () => {
    await renderAsync(<WhereToBuySection departments={departments} onlineStores={stores} />);
    const link = screen.getByRole("link", { name: /^Comprar en Walmart/ });
    expect(link.getAttribute("href")).toBe("https://www.walmart.com.gt");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");
    expect(link.getAttribute("data-event")).toBe("retailer_click");
    expect(link.getAttribute("data-retailer")).toBe("walmart");
    expect(link.textContent).toContain("(se abre en otra pestaña)");
    // Una tienda sin URL no da botón.
    expect(screen.queryByRole("link", { name: /Sin URL/ })).toBeNull();
    expect(screen.getByRole("link", { name: "Ver todas las tiendas" }).getAttribute("href")).toBe(
      "/donde-comprar",
    );
  });

  it("sin departamentos no dibuja el formulario", async () => {
    await renderAsync(<WhereToBuySection departments={[]} onlineStores={[]} />);
    expect(screen.queryByRole("combobox")).toBeNull();
  });
});

describe("HistorySection (BD-053)", () => {
  const milestones: MilestoneView[] = [
    { key: "nace", year: 1966, title: "Nace K-66", description: "Inicio." },
    { key: "sesenta", year: 2026, title: "60 años", description: "Hoy." },
  ];

  it("una línea de tiempo con los hitos en orden y el botón a la historia", async () => {
    await renderAsync(<HistorySection milestones={milestones} />);
    const section = screen.getByRole("region", { name: "60 años escribiendo con Guatemala" });
    const items = within(section).getAllByRole("listitem");
    // El año va dentro del h3.
    expect(items.map((li) => within(li).getByRole("heading", { level: 3 }).textContent)).toEqual([
      "1966Nace K-66",
      "202660 años",
    ]);
    expect(section.querySelector(".timeline-line")).not.toBeNull();
    expect(
      within(section).getByRole("link", { name: "Conoce nuestra historia" }).getAttribute("href"),
    ).toBe("/nuestra-historia");
  });
});
