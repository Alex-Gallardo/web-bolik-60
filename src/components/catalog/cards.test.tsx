import { readFileSync } from "node:fs";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AudienceCard } from "@/components/home/audience-card";
import { StoreCard, directionsUrl } from "@/components/stores/store-card";
import { Badge } from "@/components/ui/badge";
import { Chip, ChipToggle } from "@/components/ui/chip";
import { ui } from "@/content/ui";
import { contrastRatio } from "@/lib/contrast";
import type { CategoryView, ProductCardView, StoreView } from "@/server/data/types";
import { CategoryCard } from "./category-card";
import { PRODUCT_CARD_SIZES, ProductCard } from "./product-card";
import { ProductCardSkeleton } from "./product-card-skeleton";

const product: ProductCardView = {
  slug: "bolik-ultra",
  name: "Bolik Ultra",
  href: "/productos/boligrafos/bolik-ultra",
  category: { slug: "boligrafos", name: "Bolígrafos", lineGroup: "escritura" },
  shortDescription: "Bolígrafo hexagonal",
  colors: [
    { key: "azul", name: "Azul", hex: "#1D3FCE" }, // check-colors-ignore: dato de prueba
    { key: "negro", name: "Negro", hex: "#111318" }, // check-colors-ignore: dato de prueba
  ],
  skus: ["PT00058", "PT00059"],
  featured: true,
  sample: false,
  image: null,
};

const store: StoreView = {
  slug: "tulan",
  name: "Tulán",
  type: "libreria",
  department: { slug: "quetzaltenango", name: "Quetzaltenango" },
  municipality: "Quetzaltenango",
  address: "4a. calle 12-34, zona 1",
  phone: "77612345",
  websiteUrl: null,
  onlineShopUrl: null,
  lat: null,
  lng: null,
  isVerified: false,
};

describe("ProductCard", () => {
  it("es un solo enlace con su título, línea y colores", () => {
    render(<ProductCard product={product} />);
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(1);
    expect(links[0]!.getAttribute("href")).toBe("/productos/boligrafos/bolik-ultra");
    expect(screen.getByRole("heading", { level: 3, name: "Bolik Ultra" })).toBeTruthy();
    expect(within(links[0]!).getByText("Bolígrafos")).toBeTruthy();
    expect(within(links[0]!).getByText("Colores: azul y negro")).toBeTruthy();
    expect(within(links[0]!).getByText(ui.cards.viewProduct)).toBeTruthy();
    // Sin foto: el cuadro 1:1 queda reservado y no hay <img>.
    expect(screen.queryByRole("img")).toBeNull();
    expect(links[0]!.querySelector(".aspect-square")).not.toBeNull();
  });

  it("el nombre accesible empieza por el producto, no por la categoría", () => {
    render(<ProductCard product={product} />);
    const link = screen.getByRole("link");
    expect(link.textContent?.startsWith("Bolik Ultra")).toBe(true);
    // El chip se ve arriba solo por CSS.
    expect(within(link).getByText("Bolígrafos").closest(".order-first")).not.toBeNull();
  });

  it("no repite colores, resume los puntos de más y sin colores no muestra la línea", () => {
    const hex = "#1D3FCE"; // check-colors-ignore: dato de prueba
    const many = ["a", "b", "c", "d", "e", "f", "g"].map((k) => ({ key: k, name: k, hex }));
    const { unmount } = render(
      <ProductCard product={{ ...product, colors: [...many, many[0]!] }} />,
    );
    expect(screen.getByText(ui.cards.moreColors(2))).toBeTruthy();
    expect(screen.getByText("Colores: a, b, c, d, e, f y g")).toBeTruthy();
    unmount();
    render(<ProductCard product={{ ...product, colors: [] }} />);
    expect(screen.queryByText(/^Colores?:/)).toBeNull();
  });

  it("con foto usa su alt y los sizes de la grilla", () => {
    render(
      <ProductCard
        headingLevel={2}
        product={{
          ...product,
          image: {
            src: "/media/products/x",
            alt: "Bolik Ultra azul",
            width: 800,
            height: 800,
            blurDataUrl: null,
          },
        }}
      />,
    );
    const img = screen.getByRole("img", { name: "Bolik Ultra azul" });
    expect(img.getAttribute("sizes")).toBe(PRODUCT_CARD_SIZES);
    expect(screen.getByRole("heading", { level: 2 })).toBeTruthy();
  });

  it("el skeleton es decorativo y tiene el mismo marco", () => {
    const { container } = render(<ProductCardSkeleton />);
    const root = container.firstElementChild!;
    expect(root.getAttribute("aria-hidden")).toBe("true");
    expect(root.querySelector(".aspect-square.skeleton")).not.toBeNull();
    // Mismas alturas que la tarjeta: chip 24 px, título text-lg leading-tight, colores text-sm.
    const bars = [...root.querySelectorAll(".p-4 .skeleton")].map((el) => el.className);
    expect(bars[0]).toContain("h-6");
    expect(bars[1]).toContain("h-[1.40625rem]");
    expect(bars[2]).toContain("h-5");
    expect(root.querySelector(".mt-auto.pt-2 > .skeleton")).not.toBeNull();
  });
});

describe("CategoryCard y AudienceCard", () => {
  it("la categoría es un solo enlace con su conteo", () => {
    const category: CategoryView = {
      slug: "marcadores",
      name: "Marcadores",
      lineGroup: "oficina",
      shortText: "Pizarra y permanentes.",
      intro: null,
      href: "/productos/marcadores",
      productCount: 1,
    };
    render(<CategoryCard category={category} />);
    expect(screen.getAllByRole("link")).toHaveLength(1);
    expect(screen.getByText("1 producto")).toBeTruthy();
    expect(ui.cards.products(1200)).toBe("1,200 productos");
  });

  it("la tarjeta de público es un solo enlace", () => {
    render(
      <AudienceCard title="Librerías" text="Precio de fábrica." href="/mayoreo" tone="yellow" />,
    );
    const link = screen.getByRole("link", { name: /Librerías/ });
    expect(link.getAttribute("href")).toBe("/mayoreo");
    expect(link.className).toContain("text-ink");
  });
});

describe("StoreCard", () => {
  it("sin verificar: lugar y teléfono, sin dirección; el mapa busca por nombre", () => {
    render(<StoreCard store={{ ...store, lat: 14.83, lng: -91.52 }} />);
    expect(screen.getByRole("heading", { name: "Tulán" })).toBeTruthy();
    expect(screen.getByText("Librería")).toBeTruthy();
    expect(screen.getByText("+502 7761 2345")).toBeTruthy();
    expect(screen.getByText(ui.cards.unverified)).toBeTruthy();
    expect(screen.queryByText(/4a. calle/)).toBeNull();
    const call = screen.getByRole("link", { name: "Llamar a Tulán" });
    expect(call.getAttribute("href")).toBe("tel:+50277612345");
    const directions = screen.getByRole("link", {
      name: `Cómo llegar a Tulán ${ui.cards.newTab}`,
    });
    expect(directions.getAttribute("href")).toBe(
      "https://www.google.com/maps/dir/?api=1&destination=Tul%C3%A1n%2C%20Quetzaltenango%2C%20Quetzaltenango%2C%20Guatemala",
    );
    expect(directions.getAttribute("target")).toBe("_blank");
  });

  it("verificada: muestra la dirección y el mapa la usa", () => {
    render(<StoreCard store={{ ...store, isVerified: true }} />);
    expect(screen.getByText(/4a. calle 12-34, zona 1/)).toBeTruthy();
    expect(screen.queryByText(ui.cards.unverified)).toBeNull();
    expect(screen.getByRole("link", { name: /^Cómo llegar/ }).getAttribute("href")).toContain(
      "destination=Tul%C3%A1n%2C%204a.%20calle",
    );
  });

  it("sin teléfono ni tienda en línea solo queda «Cómo llegar»", () => {
    render(<StoreCard store={{ ...store, phone: null }} />);
    expect(screen.getAllByRole("link")).toHaveLength(1);
  });

  it("la tienda en línea solo se enlaza si es https", () => {
    const { unmount } = render(
      <StoreCard store={{ ...store, onlineShopUrl: "http://tienda.example" }} />,
    );
    expect(screen.queryByRole("link", { name: /^Comprar en línea/ })).toBeNull();
    unmount();
    render(<StoreCard store={{ ...store, onlineShopUrl: "https://tienda.example" }} />);
    expect(
      screen.getByRole("link", { name: `Comprar en línea en Tulán ${ui.cards.newTab}` }),
    ).toBeTruthy();
  });

  it("con coordenadas verificadas, el mapa usa lat y lng", () => {
    expect(directionsUrl({ ...store, isVerified: true, lat: 14.83, lng: -91.52 })).toBe(
      "https://www.google.com/maps/dir/?api=1&destination=14.83,-91.52",
    );
  });
});

describe("Badge y Chip", () => {
  it("el badge siempre lleva texto", () => {
    render(<Badge tone="success">Ganada</Badge>);
    expect(screen.getByText("Ganada").className).toContain("bg-green-50");
  });

  it("el chip de línea lleva su punto de color decorativo", () => {
    const { container } = render(<Chip line="arte">Crayones</Chip>);
    expect(container.querySelector("[aria-hidden='true']")?.className).toContain("bg-line-arte");
  });

  it("el chip seleccionable es un botón con aria-pressed", () => {
    const onClick = vi.fn();
    const { rerender } = render(
      <ChipToggle line="escolar" pressed={false} onClick={onClick}>
        Escolar
      </ChipToggle>,
    );
    const chip = screen.getByRole("button", { name: "Escolar", pressed: false });
    fireEvent.click(chip);
    expect(onClick).toHaveBeenCalledOnce();
    rerender(
      <ChipToggle line="escolar" pressed onClick={onClick}>
        Escolar
      </ChipToggle>,
    );
    expect(screen.getByRole("button", { name: "Escolar", pressed: true }).className).toContain(
      "border-ink",
    );
  });
});

/** Colores de src/styles/tokens.css (los var() se resuelven a su hex). */
function readTokens(): Record<string, string> {
  const css = readFileSync("src/styles/tokens.css", "utf8");
  const raw = Object.fromEntries(
    [...css.matchAll(/--([a-z0-9-]+):\s*([^;]+);/gi)].map((m) => [m[1]!, m[2]!.trim()]),
  );
  const resolve = (value: string): string => {
    const ref = /^var\(--([a-z0-9-]+)\)$/.exec(value);
    return ref ? resolve(raw[ref[1]!]!) : value;
  };
  return Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, resolve(v)]));
}

describe("contraste AA de tarjetas, chips y badges (texto, 4.5:1)", () => {
  const t = readTokens();
  const pairs: [string, string, string][] = [
    ["público azul", "paper", "blue"],
    ["público navy", "paper", "navy"],
    ["público amarillo", "ink", "yellow"],
    ["público rojo", "paper", "red"],
    ["público verde", "paper", "green"],
    ["chip/badge neutro", "ink", "soft"],
    ["chip escritura / badge info", "blue-700", "blue-50"],
    ["chip escolar", "ink", "yellow-50"],
    ["chip arte / badge peligro", "red-700", "red-50"],
    ["chip oficina / badge éxito", "green", "green-50"],
    ["badge advertencia (texto en tinta)", "ink", "warning-bg"],
    ["texto secundario de tarjeta", "muted", "paper"],
  ];
  it.each(pairs)("%s", (_name, text, background) => {
    expect(contrastRatio(t[text]!, t[background]!)).toBeGreaterThanOrEqual(4.5);
  });
});
