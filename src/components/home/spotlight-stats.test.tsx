import { render, screen, within } from "@testing-library/react";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ProductView, SiteStatView } from "@/server/data/types";
import { ProductSpotlight } from "./product-spotlight";
import { StatsBand } from "./stats-band";

// Section lee la apariencia de la BD: aquí sin registro (queda el fondo del código).
const { getSectionAppearance } = vi.hoisted(() => ({ getSectionAppearance: vi.fn() }));
vi.mock("@/server/data/content", () => ({ getSectionAppearance }));

beforeEach(() => {
  getSectionAppearance.mockReset();
  getSectionAppearance.mockResolvedValue(null);
});

/** La sección devuelve <Section> (async) como raíz: se resuelve antes de renderizar. */
async function renderAsync(element: ReactElement) {
  const tree = element.type as (props: unknown) => ReactElement | null;
  const resolved = tree(element.props);
  if (!resolved) return render(<></>);
  const section = resolved.type as (props: unknown) => Promise<ReactElement>;
  return render(await section(resolved.props));
}

const stat = (key: string, value: number, label: string, suffix: string | null = null) =>
  ({ key, value, prefix: null, suffix, label }) as SiteStatView;

const ultra = {
  slug: "bolik-ultra",
  name: "Bolik Ultra",
  href: "/productos/boligrafos/bolik-ultra",
  shortDescription: "Bolígrafo hexagonal de punta mediana 1.0 mm.",
  image: null,
  variants: [
    {
      sku: "PT00058",
      barcode: null,
      isDefault: true,
      color: { key: "azul", name: "Azul", hex: "color-azul" },
    },
    {
      sku: "PT00059",
      barcode: null,
      isDefault: false,
      color: { key: "negro", name: "Negro", hex: "color-negro" },
    },
  ],
  packagings: [
    { code: "blister1", name: "Blister de 1" },
    { code: "cajilla12", name: "Cajilla de 12" },
  ],
  benefits: [
    { iconKey: "new-tip", title: "Punta de última generación", text: null },
    { iconKey: "low-viscosity", title: "Baja viscosidad", text: null },
    { iconKey: "water-resistant", title: "Resistente al agua y a la luz", text: null },
  ],
} as unknown as ProductView;

describe("StatsBand (BD-052)", () => {
  it("el número final está en el HTML (SEO y lector de pantalla), con su etiqueta", async () => {
    await renderAsync(
      <StatsBand
        items={[
          stat("anios", 60, "años escribiendo con Guatemala"),
          stat("pv", 1800, "puntos de venta", "+"),
        ]}
      />,
    );
    const section = screen.getByRole("region", { name: "Bolik en cifras" });
    expect(section.dataset.bg).toBe("brand");
    const items = within(section).getAllByRole("listitem");
    expect(items).toHaveLength(2);
    // El final exacto en el texto para lector de pantalla (CountUp también pinta copias visuales).
    expect(within(items[0]!).getByText("60", { selector: ".sr-only" })).toBeTruthy();
    expect(within(items[0]!).getByText("años escribiendo con Guatemala")).toBeTruthy();
    expect(within(items[1]!).getByText("1,800+", { selector: ".sr-only" })).toBeTruthy();
  });

  it("sin cifras publicadas no hay franja", async () => {
    const { container } = await renderAsync(<StatsBand items={[]} />);
    expect(container.innerHTML).toBe("");
  });
});

describe("ProductSpotlight (BD-052)", () => {
  it("nombre, colores con código, presentaciones, beneficios acordados y CTA de docs/17", async () => {
    await renderAsync(<ProductSpotlight product={ultra} />);
    const section = screen.getByRole("region", { name: "Bolik Ultra" });
    expect(within(section).getByRole("heading", { level: 2 }).textContent).toBe("Bolik Ultra");
    expect(within(section).getByText("Nuestro bolígrafo estrella")).toBeTruthy();
    expect(within(section).getByText("Azul · PT00058")).toBeTruthy();
    expect(within(section).getByText("Negro · PT00059")).toBeTruthy();
    expect(within(section).getByText("Blister de 1 · Cajilla de 12")).toBeTruthy();
    // El beneficio en discusión con Mercadeo no sale.
    const benefits = within(section).getByRole("list", { name: "Beneficios" });
    expect(
      within(benefits)
        .getAllByRole("listitem")
        .map((li) => li.textContent),
    ).toEqual(["Punta de última generación", "Resistente al agua y a la luz"]);
    expect(
      within(section)
        .getByRole("link", { name: /^Ver ficha\s*del Bolik Ultra$/ })
        .getAttribute("href"),
    ).toBe("/productos/boligrafos/bolik-ultra");
    expect(within(section).getByRole("link", { name: "Dónde comprar" }).getAttribute("href")).toBe(
      "/donde-comprar",
    );
  });

  it("sin foto, la ilustración; con foto, un <img> con srcset y alt real", async () => {
    const { unmount } = await renderAsync(<ProductSpotlight product={ultra} />);
    expect(document.querySelector("img")).toBeNull();
    // Un bolígrafo por color, con el color de la variante.
    const pens = document.querySelectorAll("[data-illustration='ultra'] g");
    expect(pens).toHaveLength(2);
    unmount();

    await renderAsync(
      <ProductSpotlight
        product={{
          ...ultra,
          image: {
            src: "/media/products/ultra-a1b2c3d4",
            alt: "Bolik Ultra azul",
            width: 1280,
            height: 960,
            blurDataUrl: null,
          },
        }}
      />,
    );
    const img = screen.getByRole("img", { name: "Bolik Ultra azul" });
    expect(img.getAttribute("srcset")).toContain("ultra-a1b2c3d4");
  });
});
