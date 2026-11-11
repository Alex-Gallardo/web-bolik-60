import { render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Section, resolveTone } from "./section";

const { getSectionAppearance } = vi.hoisted(() => ({ getSectionAppearance: vi.fn() }));
vi.mock("@/server/data/content", () => ({ getSectionAppearance }));

beforeEach(() => {
  getSectionAppearance.mockReset();
  getSectionAppearance.mockResolvedValue(null);
});

type Props = Omit<ComponentProps<typeof Section>, "children"> & {
  children?: ComponentProps<typeof Section>["children"];
};

/** Section es async (Server Component): se resuelve antes de renderizar. */
async function renderSection({ children = "Contenido", ...props }: Props) {
  render(await Section({ ...props, children, ...{ "data-testid": "seccion" } }));
  return screen.getByTestId("seccion");
}

describe("resolveTone", () => {
  it("deduce el tono del fondo y respeta el que se pasa", () => {
    expect(resolveTone("navy")).toBe("dark");
    expect(resolveTone("brand")).toBe("dark");
    expect(resolveTone("dots")).toBe("light");
    expect(resolveTone("navy", "light")).toBe("light");
  });
});

describe("Section", () => {
  it("dibuja un <section> con fondo paper, tono claro, espacio md y contenedor", async () => {
    const section = await renderSection({});
    expect(section.tagName).toBe("SECTION");
    expect(section.dataset.bg).toBe("paper");
    expect(section.dataset.tone).toBe("light");
    expect(section.className).toContain("py-(--section-y)");
    expect(section.firstElementChild?.className).toContain("container-site");
    expect(getSectionAppearance).not.toHaveBeenCalled();
  });

  it("acepta fondo, espacio, etiqueta y atributos, y puede ir sin contenedor", async () => {
    const section = await renderSection({
      background: "navy",
      spacing: "sm",
      as: "aside",
      id: "mayoreo",
      "aria-labelledby": "mayoreo-titulo",
      contained: false,
      children: <h2 id="mayoreo-titulo">Mayoreo</h2>,
    });
    expect(section.tagName).toBe("ASIDE");
    expect(section.id).toBe("mayoreo");
    expect(section.getAttribute("aria-labelledby")).toBe("mayoreo-titulo");
    expect(section.dataset.tone).toBe("dark");
    expect(section.className).toContain("py-[calc(var(--section-y)/2)]");
    expect(section.firstElementChild?.tagName).toBe("H2");
  });

  it("con appearanceKey, el fondo guardado gana al del código", async () => {
    getSectionAppearance.mockResolvedValue({ backgroundPreset: "sun", tone: "light" });
    const section = await renderSection({ background: "navy", appearanceKey: "home.solutions" });
    expect(getSectionAppearance).toHaveBeenCalledWith("home.solutions");
    expect(section.dataset.bg).toBe("sun");
    expect(section.dataset.tone).toBe("light");
  });

  it("un tono guardado que contradice el fondo no gana: el texto sigue legible", async () => {
    getSectionAppearance.mockResolvedValue({ backgroundPreset: "navy", tone: "light" });
    const section = await renderSection({ appearanceKey: "home.cta" });
    expect(section.dataset.bg).toBe("navy");
    expect(section.dataset.tone).toBe("dark");
  });

  it("con appearanceKey sin registro, quedan los del código", async () => {
    const section = await renderSection({ background: "brand", appearanceKey: "home.stats" });
    expect(section.dataset.bg).toBe("brand");
    expect(section.dataset.tone).toBe("dark");
  });

  it("un data-bg de afuera no pisa el fondo resuelto", async () => {
    const section = await renderSection({ background: "dots", ...{ "data-bg": "navy" } });
    expect(section.dataset.bg).toBe("dots");
  });
});
