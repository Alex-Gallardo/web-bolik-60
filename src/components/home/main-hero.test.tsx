import { render, screen, within } from "@testing-library/react";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ColorView } from "@/server/data/types";
import { MainHero } from "./main-hero";

// Section lee la apariencia de la BD: aquí sin registro (queda el fondo del código).
const { getSectionAppearance } = vi.hoisted(() => ({ getSectionAppearance: vi.fn() }));
vi.mock("@/server/data/content", () => ({ getSectionAppearance }));

beforeEach(() => {
  getSectionAppearance.mockReset();
  getSectionAppearance.mockResolvedValue(null);
});

async function renderAsync(element: ReactElement) {
  const section = element.type as (props: unknown) => Promise<ReactElement>;
  return render(await section(element.props));
}

const colors = [
  { key: "azul", name: "Azul", hex: "tinta-azul" },
  { key: "negro", name: "Negro", hex: "tinta-negra" },
] as ColorView[];

describe("MainHero (BD-056)", () => {
  it("el único h1 con el subrayado de tinta, el chip, el texto y los dos CTA", async () => {
    await renderAsync(MainHero({ colors }));
    const headings = screen.getAllByRole("heading", { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]!.textContent).toBe("De la materia prima a tu primer trazo.");
    expect(headings[0]!.querySelector(".ink-draw")).not.toBeNull();
    const region = screen.getByRole("region", { name: "De la materia prima a tu primer trazo." });
    expect(region.dataset.bg).toBe("brand");
    expect(region.textContent).toContain("60 años · Hecho en Guatemala");
    expect(region.textContent).toContain(
      "Útiles escolares y de oficina fabricados en Guatemala desde 1966.",
    );
    const primary = within(region).getByRole("link", { name: "Ver productos" });
    expect(primary.getAttribute("href")).toBe("/productos");
    expect(primary.dataset.event).toBe("hero_cta_click");
    expect(
      within(region).getByRole("link", { name: "Cotizar por mayor" }).getAttribute("href"),
    ).toBe("/mayoreo");
  });

  it("el LCP es texto: ninguna imagen; la ilustración del Ultra es decorativa", async () => {
    const { container } = await renderAsync(MainHero({ colors }));
    expect(container.querySelector("img")).toBeNull();
    const art = container.querySelector(".hero-art")!;
    expect(art.getAttribute("aria-hidden")).toBe("true");
    expect(art.querySelectorAll('[data-illustration="ultra"] g')).toHaveLength(2);
  });

  it("sin colores del Ultra queda el texto, sin ilustración", async () => {
    const { container } = await renderAsync(MainHero({ colors: [] }));
    expect(container.querySelector(".hero-art")).toBeNull();
    expect(screen.getByRole("heading", { level: 1 })).toBeTruthy();
  });
});
