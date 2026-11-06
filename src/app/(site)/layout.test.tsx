import { Children, isValidElement, type ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { FloatingActions } from "@/components/layout/floating-actions";
import { Header } from "@/components/layout/header";
import { floatingText } from "@/content/footer";
import type { SiteSettings } from "@/server/data/types";

// Datos del layout sin fuente real. El árbol no se renderiza (el pie es async, de servidor): se
// revisan las props que el layout le pasa a cada pieza.
const settings: SiteSettings = {
  phone: "+502 6628 2600",
  address: "6a. Avenida 6-31, zona 2, San José Villa Nueva, Guatemala",
  businessHours: "Lunes a viernes, 7:30 a 16:30",
  legalName: "Industrias Bolik, S.A.",
  whatsappNumber: null,
  socialFacebook: null,
  splashEnabled: true,
  kitsEnabled: false,
  minCustomOrder: null,
};
vi.mock("next/cache", () => ({ cacheLife: () => {} }));
vi.mock("@/server/data/catalog", () => ({ listCategories: async () => [] }));
vi.mock("@/server/data/content", () => ({ getSiteSettings: async () => settings }));

const { default: SiteLayout } = await import("./layout");

/** Props de WhatsApp que reciben el header (menú móvil) y los flotantes. */
async function whatsappProps() {
  const tree = (await SiteLayout({ children: null } as never)) as ReactElement<{
    children: ReactElement[];
  }>;
  return Children.toArray(tree.props.children)
    .filter(isValidElement)
    .filter((el) => el.type === Header || el.type === FloatingActions)
    .map((el) => (el.props as { whatsappUrl: string | null }).whatsappUrl);
}

describe("layout del sitio (BD-042)", () => {
  it("con número, el menú móvil y los flotantes reciben WhatsApp con el mensaje prellenado", async () => {
    settings.whatsappNumber = "5555 5555";
    const urls = await whatsappProps();
    expect(urls).toHaveLength(2);
    for (const href of urls) {
      const url = new URL(href!);
      expect(url.origin + url.pathname).toBe("https://wa.me/50255555555");
      expect(url.searchParams.get("text")).toBe(floatingText.whatsappMessage);
    }
  });

  it("sin número, ningún botón de WhatsApp", async () => {
    settings.whatsappNumber = null;
    expect(await whatsappProps()).toEqual([null, null]);
  });
});
