import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { floatingText } from "@/content/footer";
import { ui } from "@/content/ui";
import { FloatingActions } from "./floating-actions";
import { Footer, type FooterProps } from "./footer";

// cacheLife solo funciona dentro del compilador de Next ('use cache'); aquí no hace nada.
vi.mock("next/cache", () => ({ cacheLife: () => {} }));

const props: FooterProps = {
  categories: [
    { name: "Bolígrafos", href: "/productos/boligrafos" },
    { name: "Marcadores", href: "/productos/marcadores" },
  ],
  legalName: "Industrias Bolik, S.A.",
  address: "6a. Avenida 6-31, zona 2, San José Villa Nueva, Guatemala",
  phone: "+502 6628 2600",
  businessHours: "Lunes a viernes, 7:30 a 16:30",
  facebookUrl: "https://www.facebook.com/universoBolik",
  kitsEnabled: false,
};

const renderFooter = async (overrides: Partial<FooterProps> = {}) =>
  render(await Footer({ ...props, ...overrides }));

const WA = "https://wa.me/50255555555?text=Hola";

describe("Footer (BD-042)", () => {
  it("muestra el NAP desde los ajustes con el teléfono en tel:", async () => {
    await renderFooter();
    const footer = screen.getByRole("contentinfo");
    const address = footer.querySelector("address")!;
    expect(address.textContent).toContain("Industrias Bolik, S.A.");
    expect(address.textContent).toContain(props.address);
    expect(address.textContent).toContain(props.businessHours);
    const phone = screen.getByRole("link", { name: "Llamar al +502 6628 2600" });
    expect(phone.getAttribute("href")).toBe("tel:+50266282600");
    expect(phone.textContent).toBe("+502 6628 2600");
  });

  it("un teléfono que no es válido se muestra como texto, sin enlace roto", async () => {
    await renderFooter({ phone: "por confirmar" });
    expect(document.querySelector("a[href^='tel:']")).toBeNull();
    expect(screen.getByText("por confirmar")).toBeTruthy();
  });

  it("enlaza cada categoría, los públicos, Bolik y lo legal", async () => {
    await renderFooter();
    const footer = screen.getByRole("contentinfo");
    for (const [name, href] of [
      ["Bolígrafos", "/productos/boligrafos"],
      ["Marcadores", "/productos/marcadores"],
      ["Ver todo el catálogo", "/productos"],
      ["Escuelas", "/escuelas"],
      ["Librerías", "/mayoreo"],
      ["Nuestra historia", "/nuestra-historia"],
      ["Privacidad", "/legal/privacidad"],
      ["Términos", "/legal/terminos"],
    ])
      expect(within(footer).getByRole("link", { name }).getAttribute("href")).toBe(href);
    expect(
      within(footer)
        .getAllByRole("heading", { level: 2 })
        .map((h) => h.textContent),
    ).toEqual(["Productos", "Para ti", "Bolik", "Legal"]);
  });

  it("«Familias» va a los kits solo si están activos", async () => {
    const { unmount } = await renderFooter();
    expect(screen.getByRole("link", { name: "Familias" }).getAttribute("href")).toBe(
      "/donde-comprar",
    );
    unmount();
    await renderFooter({ kitsEnabled: true });
    expect(screen.getByRole("link", { name: "Familias" }).getAttribute("href")).toBe(
      "/kits-escolares",
    );
  });

  it("Facebook abre en otra pestaña y avisa; sin URL no aparece", async () => {
    const { unmount } = await renderFooter();
    const facebook = screen.getByRole("link", { name: /Facebook/ });
    expect(facebook.getAttribute("target")).toBe("_blank");
    expect(facebook.getAttribute("rel")).toBe("noopener noreferrer");
    expect(facebook.textContent).toContain(ui.header.newTab);
    unmount();
    await renderFooter({ facebookUrl: null });
    expect(screen.queryByRole("link", { name: /Facebook/ })).toBeNull();
  });

  it("© con el año en curso y «Volver arriba» al inicio de la página", async () => {
    await renderFooter();
    const year = new Date().getFullYear();
    // En la víspera de año nuevo la hora de Guatemala puede ir un año atrás de la del equipo.
    expect(
      screen.getByText(new RegExp(`© (${year}|${year - 1}) Bolik\\. Hecho en Guatemala\\.`)),
    ).toBeTruthy();
    expect(screen.getByRole("link", { name: "Volver arriba" }).getAttribute("href")).toBe("#top");
  });
});

describe("FloatingActions (BD-042)", () => {
  it("con número: WhatsApp en la barra móvil y el botón flotante, con mensaje y pestaña nueva", () => {
    render(<FloatingActions whatsappUrl={WA} />);
    const links = screen.getAllByRole("link", { name: /WhatsApp/ });
    expect(links).toHaveLength(2);
    for (const link of links) {
      expect(link.getAttribute("href")).toBe(WA);
      expect(link.getAttribute("target")).toBe("_blank");
      expect(link.getAttribute("rel")).toBe("noopener noreferrer");
    }
    expect(
      screen.getByRole("link", { name: `${floatingText.whatsapp} ${ui.header.newTab}` }),
    ).toBeTruthy();
    const bar = screen.getByRole("navigation", { name: floatingText.label });
    expect(within(bar).getByRole("link", { name: "Cotizar" }).getAttribute("href")).toBe(
      ui.header.cta.href,
    );
  });

  it("sin número no hay botones de WhatsApp: la barra queda solo con «Cotizar»", () => {
    render(<FloatingActions whatsappUrl={null} />);
    expect(screen.queryByRole("link", { name: /WhatsApp/ })).toBeNull();
    const bar = screen.getByRole("navigation", { name: floatingText.label });
    expect(
      within(bar)
        .getAllByRole("link")
        .map((a) => a.textContent),
    ).toEqual(["Cotizar"]);
    expect(screen.getByRole("link", { name: "Volver arriba" }).getAttribute("href")).toBe("#top");
  });
});
