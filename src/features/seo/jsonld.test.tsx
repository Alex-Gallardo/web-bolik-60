import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { JsonLd, faqPageJsonLd, serializeJsonLd } from "./jsonld";

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
