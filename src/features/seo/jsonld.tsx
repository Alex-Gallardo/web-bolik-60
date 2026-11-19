/**
 * Datos estructurados JSON-LD (docs/10 §4). FAQPage (BD-054), BreadcrumbList y CollectionPage
 * (BD-060), ProductGroup (BD-062), Organization y WebSite (BD-091). Dónde comprar (Store), la
 * historia (AboutPage) y la página de preguntas frecuentes suman los suyos en BD-080, BD-109 y
 * BD-110. Regla de docs/10: el texto del JSON-LD es el mismo que se ve en la página, sin campos
 * inventados (sin precios, ofertas ni reseñas).
 */

import { toInternationalPhone } from "@/lib/format";
import { isValidGtin } from "@/lib/gtin";
import { SITE } from "./metadata";

type JsonLdObject = { "@context": "https://schema.org"; "@type": string } & Record<string, unknown>;

/**
 * Serializa para un <script> en línea: `<` va como \u003c, así un texto con «</script>» no cierra
 * la etiqueta (ni abre HTML). JSON.parse lo lee igual.
 */
export function serializeJsonLd(data: JsonLdObject): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

/** Server Component: el bloque va en el HTML estático, sin JS de cliente. */
export function JsonLd({ data }: { data: JsonLdObject }) {
  return (
    <script
      type="application/ld+json"
      // El contenido ya está escapado por serializeJsonLd.
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}

type FaqEntry = { question: string; answer: string };

/** FAQPage con las mismas preguntas y respuestas que muestra el acordeón. */
export function faqPageJsonLd(faqs: readonly FaqEntry[]): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };
}

/** URL absoluta del sitio para una ruta («/productos» → «https://www.bolik66.com/productos»). */
const absolute = (path: string) => new URL(path, SITE.url).toString();

/**
 * @id estable de la organización («https://www.bolik66.com/#organization»): el fabricante de cada
 * ProductGroup y el publicador del WebSite apuntan aquí, y Google los une en una sola entidad.
 */
export const ORGANIZATION_ID = `${absolute("/")}#organization`;

/** Logo de la organización: el SVG de la marca en color (Google acepta SVG; docs/02). */
const LOGO_PATH = "/brand/bolik-logo.svg";

export type OrganizationInput = {
  /** Razón social (SiteSetting legal_name): «Industrias Bolik, S.A.». */
  legalName: string;
  /** Dirección tal como la muestra el pie (SiteSetting address). */
  address: string;
  /** Teléfono como lo muestra el pie; sale en formato internacional (+502…). */
  phone: string;
  /** Redes (https) que existan; las vacías no se publican. */
  sameAs: readonly (string | null)[];
};

/**
 * Organization (docs/10 §4: en todas las páginas, con @id estable). Los datos son los del pie
 * (SiteSetting): razón social, dirección y teléfono; fundación en junio de 1966 (docs/02). La
 * dirección va completa en streetAddress con el país: partirla en municipio y departamento sería
 * inventar una estructura que el ajuste no tiene.
 */
export function organizationJsonLd(org: OrganizationInput): JsonLdObject {
  const phone = toInternationalPhone(org.phone);
  const sameAs = org.sameAs.filter((url): url is string => Boolean(url));
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": ORGANIZATION_ID,
    name: SITE.name,
    legalName: org.legalName,
    url: absolute("/"),
    logo: absolute(LOGO_PATH),
    foundingDate: SITE.foundingDate,
    // Un ajuste vacío no se publica (sería un campo vacío, no un dato).
    ...(org.address.trim()
      ? {
          address: {
            "@type": "PostalAddress",
            streetAddress: org.address.trim(),
            addressCountry: "GT",
          },
        }
      : {}),
    ...(phone ? { telephone: `+${phone}` } : {}),
    ...(sameAs.length > 0 ? { sameAs } : {}),
  };
}

/**
 * WebSite con SearchAction (docs/10 §4, solo en la home): el buscador de /buscar?q= responde en
 * el servidor, también sin JS (BD-066). La plantilla se arma a mano: new URL() codificaría las
 * llaves de {search_term_string}. Google retiró el cuadro de búsqueda de los resultados (nov 2024):
 * no da fragmento enriquecido, pero sigue siendo válido y describe el sitio para Bing y las IA.
 */
export function webSiteJsonLd(): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${absolute("/")}#website`,
    name: SITE.name,
    url: absolute("/"),
    inLanguage: "es-GT",
    publisher: { "@id": ORGANIZATION_ID },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${absolute("/buscar")}?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export type Crumb = { name: string; path: string };

/** BreadcrumbList con las mismas migas que se ven (componente Breadcrumbs). */
export function breadcrumbListJsonLd(crumbs: readonly Crumb[]): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: absolute(crumb.path),
    })),
  };
}

/**
 * CollectionPage con su ItemList: los productos que lista la página, en el mismo orden (docs/10
 * §4). Solo nombre y URL: sin precios ni reseñas.
 */
export function collectionPageJsonLd({
  name,
  description,
  path,
  items,
}: {
  name: string;
  description: string;
  path: string;
  items: readonly { name: string; path: string }[];
}): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name,
    description,
    url: absolute(path),
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: items.length,
      itemListElement: items.map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: item.name,
        url: absolute(item.path),
      })),
    },
  };
}

export type ProductGroupInput = {
  name: string;
  /** Slug del producto: productGroupID. */
  slug: string;
  /** El texto que se ve en la ficha (descripción o, si no hay, la corta). */
  description: string;
  path: string;
  brand: string;
  /** Razón social del fabricante (SiteSetting legal_name), con el @id de Organization. */
  manufacturer: string;
  /** Rutas base de /media (sin ancho): se publican en 1280 px. */
  images: readonly string[];
  /** Especificaciones visibles: additionalProperty. */
  specs: readonly { label: string; value: string }[];
  variants: readonly {
    sku: string;
    barcode: string | null;
    colorKey: string;
    colorName: string;
    /** Ruta base de su foto principal. */
    image: string | null;
  }[];
};

/** Foto publicada (process-image.ts genera 1280 px, sin agrandar las pequeñas). */
const mediaUrl = (base: string) => absolute(`${base}-1280.webp`);

/**
 * ProductGroup con sus variantes Product (docs/10 §4, BD-062): sku, color, imagen, URL con
 * ?color= y gtin12 solo si el código de barras tiene 12 dígitos y su verificador es correcto.
 * Marca, fabricante, país de origen (todo lo hace Industrias Bolik en Guatemala) y las
 * especificaciones como additionalProperty. Sin offers, precio ni reseñas: no se inventan.
 */
export function productGroupJsonLd(product: ProductGroupInput): JsonLdObject {
  const url = absolute(product.path);
  const multiColor = product.variants.length > 1;
  return {
    "@context": "https://schema.org",
    "@type": "ProductGroup",
    name: product.name,
    productGroupID: product.slug,
    description: product.description,
    url,
    brand: { "@type": "Brand", name: product.brand },
    // El mismo @id y nombre que el Organization del layout (una sola entidad para Google).
    manufacturer: {
      "@type": "Organization",
      "@id": ORGANIZATION_ID,
      name: SITE.name,
      legalName: product.manufacturer,
    },
    countryOfOrigin: "GT",
    ...(product.images.length > 0 ? { image: product.images.map(mediaUrl) } : {}),
    ...(multiColor ? { variesBy: "https://schema.org/color" } : {}),
    ...(product.specs.length > 0
      ? {
          additionalProperty: product.specs.map((spec) => ({
            "@type": "PropertyValue",
            name: spec.label,
            value: spec.value,
          })),
        }
      : {}),
    hasVariant: product.variants.map((variant) => ({
      "@type": "Product",
      name: multiColor ? `${product.name} ${variant.colorName}` : product.name,
      sku: variant.sku,
      ...(variant.barcode && variant.barcode.length === 12 && isValidGtin(variant.barcode)
        ? { gtin12: variant.barcode }
        : {}),
      color: variant.colorName,
      url: multiColor ? `${url}?color=${variant.colorKey}` : url,
      ...(variant.image ? { image: mediaUrl(variant.image) } : {}),
    })),
  };
}
