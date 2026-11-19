import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  breadcrumbListJsonLd,
  collectionPageJsonLd,
  faqPageJsonLd,
  JsonLd,
  ORGANIZATION_ID,
  organizationJsonLd,
  productGroupJsonLd,
  serializeJsonLd,
  webSiteJsonLd,
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

describe("JSON-LD de la ficha (BD-062)", () => {
  const ultra = {
    name: "Bolik Ultra",
    slug: "bolik-ultra",
    description: "Bolígrafo hexagonal.",
    path: "/productos/boligrafos/bolik-ultra",
    brand: "Bolik",
    manufacturer: "Industrias Bolik, S.A.",
    images: ["/media/products/bolik-ultra-azul-principal-c9384adc"],
    specs: [{ label: "Tipo de punta", value: "Mediana 1.0 mm" }],
    variants: [
      {
        sku: "PT00058",
        barcode: "759364663092",
        colorKey: "azul",
        colorName: "Azul",
        image: "/media/products/bolik-ultra-azul-principal-c9384adc",
      },
      // Un verificador malo o un EAN-13 no van como gtin12.
      {
        sku: "PT00059",
        barcode: "759364663109",
        colorKey: "negro",
        colorName: "Negro",
        image: null,
      },
      { sku: "PT00060", barcode: null, colorKey: "rojo", colorName: "Rojo", image: null },
    ],
  };

  it("ProductGroup con variantes por color, gtin12 válido y sin precios", () => {
    const data = productGroupJsonLd(ultra);
    expect(data).toMatchObject({
      "@type": "ProductGroup",
      name: "Bolik Ultra",
      productGroupID: "bolik-ultra",
      variesBy: "https://schema.org/color",
      brand: { "@type": "Brand", name: "Bolik" },
      manufacturer: {
        "@type": "Organization",
        "@id": ORGANIZATION_ID,
        name: "Bolik",
        legalName: "Industrias Bolik, S.A.",
      },
      countryOfOrigin: "GT",
      additionalProperty: [
        { "@type": "PropertyValue", name: "Tipo de punta", value: "Mediana 1.0 mm" },
      ],
    });
    expect((data.manufacturer as { "@id": string })["@id"]).toMatch(/\/#organization$/);
    expect(data.image).toEqual([
      expect.stringMatching(/\/media\/products\/bolik-ultra-azul-principal-c9384adc-1280\.webp$/),
    ]);
    const variants = data.hasVariant as Record<string, string>[];
    expect(variants.map((v) => [v.name, v.sku, v.gtin12, v.color])).toEqual([
      ["Bolik Ultra Azul", "PT00058", "759364663092", "Azul"],
      ["Bolik Ultra Negro", "PT00059", undefined, "Negro"],
      ["Bolik Ultra Rojo", "PT00060", undefined, "Rojo"],
    ]);
    expect(variants[2]!.url).toMatch(/\/productos\/boligrafos\/bolik-ultra\?color=rojo$/);
    expect(JSON.stringify(data)).not.toMatch(/price|offers|review|rating/i);
  });

  it("con un solo color no lleva variesBy y la variante usa la URL sin color", () => {
    const data = productGroupJsonLd({
      ...ultra,
      images: [],
      specs: [],
      variants: [ultra.variants[2]!],
    });
    expect(data.variesBy).toBeUndefined();
    expect(data.image).toBeUndefined();
    expect(data.additionalProperty).toBeUndefined();
    const [variant] = data.hasVariant as Record<string, string>[];
    expect(variant!.name).toBe("Bolik Ultra");
    expect(variant!.url).toMatch(/\/bolik-ultra$/);
  });
});

describe("Organization y WebSite (BD-091)", () => {
  const org = {
    legalName: "Industrias Bolik, S.A.",
    address: "6a. Avenida 6-31, zona 2, San José Villa Nueva, Guatemala",
    phone: "+502 6628 2600",
    sameAs: ["https://www.facebook.com/universoBolik", null],
  };

  it("Organization con @id estable, datos del pie y fundación en 1966", () => {
    const data = organizationJsonLd(org);
    expect(data).toEqual({
      "@context": "https://schema.org",
      "@type": "Organization",
      "@id": ORGANIZATION_ID,
      name: "Bolik",
      legalName: "Industrias Bolik, S.A.",
      url: expect.stringMatching(/^https?:\/\/[^/]+\/$/),
      logo: expect.stringMatching(/\/brand\/bolik-logo\.svg$/),
      foundingDate: "1966-06",
      address: {
        "@type": "PostalAddress",
        streetAddress: "6a. Avenida 6-31, zona 2, San José Villa Nueva, Guatemala",
        addressCountry: "GT",
      },
      telephone: "+50266282600",
      sameAs: ["https://www.facebook.com/universoBolik"],
    });
    expect(ORGANIZATION_ID).toMatch(/^https?:\/\/[^/]+\/#organization$/);
  });

  it("sin redes, teléfono válido ni dirección, no publica esos campos", () => {
    const data = organizationJsonLd({ ...org, address: "  ", phone: "", sameAs: [null] });
    expect(data).not.toHaveProperty("telephone");
    expect(data).not.toHaveProperty("sameAs");
    expect(data).not.toHaveProperty("address");
  });

  it("WebSite con SearchAction hacia /buscar?q= y el publicador por @id", () => {
    const data = webSiteJsonLd();
    expect(data).toMatchObject({
      "@type": "WebSite",
      name: "Bolik",
      inLanguage: "es-GT",
      publisher: { "@id": ORGANIZATION_ID },
      potentialAction: {
        "@type": "SearchAction",
        "query-input": "required name=search_term_string",
      },
    });
    const target = (data.potentialAction as { target: { urlTemplate: string } }).target;
    expect(target.urlTemplate).toMatch(/\/buscar\?q=\{search_term_string\}$/);
  });

  it("ninguno publica precios, ofertas ni reseñas", () => {
    const text = JSON.stringify([organizationJsonLd(org), webSiteJsonLd()]);
    expect(text).not.toMatch(/price|offers|review|rating/i);
  });
});
