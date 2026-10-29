/**
 * Datos estructurados (schema.org) para Bolik Digital.
 * Reglas: nada inventado. Sin precios ni reseñas (el sitio no vende ni tiene reseñas).
 * Renderizar con <JsonLd data={...} /> dentro del Server Component de la página.
 */
import { SITE } from "./metadata";

type Json = Record<string, unknown>;

export function JsonLd({ data }: { data: Json | Json[] }) {
  return (
    <script
      type="application/ld+json"
      // Escapar "<" evita cerrar el <script> con contenido del CMS
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}

const abs = (path: string) => new URL(path, SITE.url).toString();
const ORG_ID = `${SITE.url}/#organization`;

export function organizationLd(): Json {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": ORG_ID,
    name: SITE.name,
    legalName: SITE.legalName,
    url: SITE.url,
    logo: abs("/brand/bolik-logo-512.png"),
    slogan: SITE.tagline,
    description: SITE.description,
    foundingDate: SITE.foundingDate,
    foundingLocation: { "@type": "Place", name: "Guatemala" },
    telephone: SITE.phone,
    address: { "@type": "PostalAddress", ...SITE.address },
    areaServed: [{ "@type": "Country", name: "Guatemala" }, { "@type": "Country", name: "El Salvador" }],
    sameAs: SITE.sameAs,
    parentOrganization: { "@type": "Organization", name: "Grupo K-66" },
  };
}

export function websiteLd(): Json {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE.url}/#website`,
    url: SITE.url,
    name: SITE.name,
    inLanguage: "es-GT",
    publisher: { "@id": ORG_ID },
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${SITE.url}/buscar?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  };
}

export function breadcrumbLd(items: { name: string; path: string }[]): Json {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: abs(it.path) })),
  };
}

export function faqLd(faqs: { question: string; answer: string }[]): Json | null {
  if (!faqs.length) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer } })),
  };
}

type ProductInput = {
  name: string;
  slug: string;
  path: string;
  description: string;
  category: string;
  images: string[];
  specs: { label: string; value: string }[];
  variants: { sku: string; barcode?: string | null; colorName: string; colorKey: string; image?: string }[];
};

/**
 * Producto con variantes de color. Un ProductGroup agrupa los colores (variesBy: color);
 * cada variante es un Product con sku y gtin cuando existe. Sin "offers": no se vende en línea.
 */
export function productLd(p: ProductInput): Json {
  const groupId = abs(`${p.path}#producto`);
  return {
    "@context": "https://schema.org",
    "@type": "ProductGroup",
    "@id": groupId,
    name: p.name,
    description: p.description,
    url: abs(p.path),
    productGroupID: p.slug,
    category: p.category,
    brand: { "@type": "Brand", name: "Bolik" },
    manufacturer: { "@id": ORG_ID },
    countryOfOrigin: "GT",
    image: p.images.map(abs),
    variesBy: "https://schema.org/color",
    additionalProperty: p.specs.map((s) => ({ "@type": "PropertyValue", name: s.label, value: s.value })),
    hasVariant: p.variants.map((v) => ({
      "@type": "Product",
      name: `${p.name} ${v.colorName}`,
      sku: v.sku,
      ...(v.barcode && /^\d{12}$/.test(v.barcode) ? { gtin12: v.barcode } : {}),
      ...(v.barcode && /^\d{13}$/.test(v.barcode) ? { gtin13: v.barcode } : {}),
      color: v.colorName,
      url: abs(`${p.path}?color=${v.colorKey}`),
      ...(v.image ? { image: abs(v.image) } : {}),
      isVariantOf: { "@id": groupId },
    })),
  };
}

export function itemListLd(name: string, items: { name: string; path: string }[]): Json {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    numberOfItems: items.length,
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, url: abs(it.path) })),
  };
}

/** Tiendas: solo las verificadas llevan dirección y coordenadas. */
export function storesLd(
  name: string,
  stores: { name: string; type: string; address?: string | null; municipality?: string | null; department: string; lat?: number | null; lng?: number | null; phone?: string | null; isVerified: boolean }[],
): Json {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    itemListElement: stores.map((s, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "Store",
        name: s.name,
        ...(s.isVerified && s.address
          ? { address: { "@type": "PostalAddress", streetAddress: s.address, addressLocality: s.municipality ?? undefined, addressRegion: s.department, addressCountry: "GT" } }
          : { areaServed: s.department }),
        ...(s.isVerified && s.lat && s.lng ? { geo: { "@type": "GeoCoordinates", latitude: s.lat, longitude: s.lng } } : {}),
        ...(s.isVerified && s.phone ? { telephone: s.phone } : {}),
      },
    })),
  };
}
