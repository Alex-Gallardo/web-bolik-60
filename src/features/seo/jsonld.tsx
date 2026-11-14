/**
 * Datos estructurados JSON-LD (docs/10 §4). BD-054 trae lo que pide la home (FAQPage); BD-091
 * suma Organization, WebSite, ProductGroup, ItemList… y los valida en cada plantilla.
 * Regla de docs/10: el texto del JSON-LD es el mismo que se ve en la página, sin campos inventados.
 */

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
