/**
 * Datos estructurados JSON-LD (docs/10 §4). BD-054 trae lo que pide la home (FAQPage); BD-091
 * suma Organization, WebSite, ProductGroup, ItemList… y los valida en cada plantilla.
 * Regla de docs/10: el texto del JSON-LD es el mismo que se ve en la página, sin campos inventados.
 */

type JsonLdObject = { "@context": "https://schema.org"; "@type": string } & Record<string, unknown>;

/**
 * Serializa para un <script> en línea: `<` va como <, así un texto con «</script>» no cierra
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
