import { render, screen, within } from "@testing-library/react";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FaqView, KitView } from "@/server/data/types";
import { FaqSection } from "./faq-section";
import { FinalCtaSection } from "./final-cta-section";
import { KitsSection } from "./kits-section";

// Section lee la apariencia de la BD: por defecto sin registro (queda el fondo del código).
const { getSectionAppearance } = vi.hoisted(() => ({ getSectionAppearance: vi.fn() }));
vi.mock("@/server/data/content", () => ({ getSectionAppearance }));

beforeEach(() => {
  getSectionAppearance.mockReset();
  getSectionAppearance.mockResolvedValue(null);
});

/** La sección devuelve <Section> (async) como raíz: se resuelve antes de renderizar. */
async function renderAsync(element: ReactElement | null) {
  if (!element) throw new Error("la sección no se dibujó");
  const section = element.type as (props: unknown) => Promise<ReactElement>;
  return render(await section(element.props));
}

const kit = (slug: string): KitView => ({
  slug,
  name: `Kit ${slug}`,
  level: "primaria",
  season: 2027,
  description: "Para primaria.",
  suggestedPrice: 99,
  items: [
    { description: "Bolik Ultra", quantity: 4 },
    { description: "Borrador", quantity: 1 },
  ],
  sample: true,
});

describe("KitsSection (BD-054)", () => {
  it("con los kits activos: 3 tarjetas como mucho, con nivel y contenido, sin precio", async () => {
    await renderAsync(KitsSection({ kits: ["a", "b", "c", "d"].map(kit), enabled: true }));
    const section = screen.getByRole("region", { name: "Kits escolares 2027" });
    const cards = within(section).getAllByRole("article");
    expect(cards).toHaveLength(3);
    expect(cards[0]!.textContent).toContain("Primaria");
    expect(
      within(cards[0]!)
        .getAllByRole("listitem")
        .map((li) => li.textContent),
    ).toEqual(["4 × Bolik Ultra", "1 × Borrador"]);
    expect(section.textContent).not.toMatch(/Q\s?99/);
    // Tarjeta blanca: conserva el tono claro aunque el fondo de la sección sea oscuro.
    expect(cards[0]!.dataset.tone).toBe("light");
    expect(
      within(section).getByRole("link", { name: "Ver kits escolares" }).getAttribute("href"),
    ).toBe("/kits-escolares");
  });

  it("con los kits apagados en los ajustes, o sin kits publicados, no se dibuja", () => {
    expect(KitsSection({ kits: [kit("a")], enabled: false })).toBeNull();
    expect(KitsSection({ kits: [], enabled: true })).toBeNull();
  });
});

describe("FaqSection (BD-054)", () => {
  const faqs: FaqView[] = Array.from({ length: 7 }, (_, i) => ({
    key: `p${i}`,
    question: `¿Pregunta ${i}?`,
    answer: `Respuesta ${i}.`,
  }));

  it("6 preguntas en <details> exclusivos, con FAQPage del mismo texto", async () => {
    const { container } = await renderAsync(FaqSection({ faqs }));
    const section = screen.getByRole("region", { name: "Preguntas frecuentes" });
    const details = section.querySelectorAll("details");
    expect(details).toHaveLength(6);
    expect([...details].every((d) => d.getAttribute("name") === "faq-home")).toBe(true);
    expect(details[0]!.id).toBe("faq-p0");
    // La respuesta está en el HTML aunque el <details> esté cerrado.
    expect(details[0]!.textContent).toContain("Respuesta 0.");

    const script = container.querySelector('script[type="application/ld+json"]')!;
    const data = JSON.parse(script.textContent!);
    expect(data["@type"]).toBe("FAQPage");
    expect(data.mainEntity.map((q: { name: string }) => q.name)).toEqual(
      [...details].map((d) => d.querySelector("summary")!.textContent),
    );
    expect(data.mainEntity[5].acceptedAnswer.text).toBe("Respuesta 5.");
    expect(
      within(section).getByRole("link", { name: "Ver todas las preguntas" }).getAttribute("href"),
    ).toBe("/preguntas-frecuentes");
  });

  it("sin preguntas no se dibuja (ni su JSON-LD)", () => {
    expect(FaqSection({ faqs: [] })).toBeNull();
  });

  it("el fondo guardado en SectionAppearance gana al del código y cambia el tono", async () => {
    getSectionAppearance.mockResolvedValue({ backgroundPreset: "navy", tone: "dark" });
    await renderAsync(FaqSection({ faqs }));
    const section = screen.getByRole("region", { name: "Preguntas frecuentes" });
    expect(getSectionAppearance).toHaveBeenCalledWith("home.faq");
    expect(section.dataset.bg).toBe("navy");
    expect(section.dataset.tone).toBe("dark");
  });
});

describe("FinalCtaSection (BD-054)", () => {
  it("cotización con quote_open y WhatsApp en otra pestaña con whatsapp_open", async () => {
    await renderAsync(FinalCtaSection({ whatsappUrl: "https://wa.me/50200000000" }));
    const section = screen.getByRole("region", { name: "¿Compras por mayor?" });
    expect(section.dataset.bg).toBe("brand");
    const quote = within(section).getByRole("link", { name: "Armar mi cotización" });
    expect(quote.getAttribute("href")).toBe("/cotizacion");
    expect(quote.dataset.event).toBe("quote_open");
    const whatsapp = within(section).getByRole("link", { name: /^Escribir por WhatsApp/ });
    expect(whatsapp.getAttribute("href")).toBe("https://wa.me/50200000000");
    expect(whatsapp.getAttribute("target")).toBe("_blank");
    expect(whatsapp.getAttribute("rel")).toBe("noopener noreferrer");
    expect(whatsapp.dataset.event).toBe("whatsapp_open");
    expect(whatsapp.dataset.context).toBe("general");
  });

  it("sin número de WhatsApp queda solo la cotización", async () => {
    await renderAsync(FinalCtaSection({ whatsappUrl: null }));
    expect(screen.queryByRole("link", { name: /WhatsApp/ })).toBeNull();
    expect(screen.getByRole("link", { name: "Armar mi cotización" })).toBeTruthy();
  });
});
