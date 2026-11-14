import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  breadcrumbListJsonLd,
  collectionPageJsonLd,
  faqPageJsonLd,
  JsonLd,
  serializeJsonLd,
} from "./jsonld";

describe("JSON-LD (BD-054)", () => {
  it("FAQPage con cada pregunta y su respuesta, sin campos extra", () => {
    expect(faqPageJsonLd([{ question: "¿Dónde?", answer: "En Guatemala." }])).toEqual({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "¿Dónde?",
          acceptedAnswer: { "@type": "Answer", text: "En Guatemala." },
        },
      ],
    });
  });

  it("un texto con </script> no cierra la etiqueta y se lee igual", () => {
    const data = faqPageJsonLd([{ question: "</script><b>x", answer: "a < b" }]);
    const json = serializeJsonLd(data);
    expect(json).not.toContain("<");
    expect(JSON.parse(json)).toEqual(data);
  });

  it("se dibuja como un <script type=application/ld+json>", () => {
    const { container } = render(<JsonLd data={faqPageJsonLd([])} />);
    const script = container.querySelector('script[type="application/ld+json"]')!;
    expect(JSON.parse(script.textContent!)["@type"]).toBe("FAQPage");
  });
});

describe("JSON-LD de colección y migas (BD-060)", () => {
  it("BreadcrumbList con posiciones y URLs absolutas", () => {
    const data = breadcrumbListJsonLd([
      { name: "Inicio", path: "/" },
      { name: "Catálogo Bolik", path: "/productos" },
    ]);
    const items = data.itemListElement as { position: number; name: string; item: string }[];
    expect(items.map((i) => [i.position, i.name])).toEqual([
      [1, "Inicio"],
      [2, "Catálogo Bolik"],
    ]);
    expect(items[1]!.item).toMatch(/^https?:\/\/[^/]+\/productos$/);
  });

  it("CollectionPage con su ItemList en el orden de la página, sin precios", () => {
    const data = collectionPageJsonLd({
      name: "Catálogo Bolik",
      description: "Intro.",
      path: "/productos",
      items: [{ name: "Bolik Ultra", path: "/productos/boligrafos/bolik-ultra" }],
    });
    expect(data["@type"]).toBe("CollectionPage");
    const list = data.mainEntity as { numberOfItems: number; itemListElement: object[] };
    expect(list.numberOfItems).toBe(1);
    expect(JSON.stringify(data)).not.toMatch(/price|offers|review/i);
  });
});
