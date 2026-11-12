import type { Route } from "next";
import Link from "next/link";
import { Section } from "@/components/layout/section";
import { Accordion } from "@/components/ui/accordion";
import { buttonVariants } from "@/components/ui/button-variants";
import { homeFaq } from "@/content/home";
import { JsonLd, faqPageJsonLd } from "@/features/seo/jsonld";
import type { FaqView } from "@/server/data/types";

/**
 * Preguntas frecuentes de la home (docs/06 §3.1 sección 12, BD-054): las de scope «home» en el
 * acordeón nativo (A-35, <details>: las respuestas están en el HTML y se leen sin JS), centrado a
 * 860 px, y su FAQPage con el mismo texto (docs/10 §4). Abre de a una (name del <details>).
 */
export function FaqSection({ faqs }: { faqs: FaqView[] }) {
  if (faqs.length === 0) return null;
  const titleId = "faq-titulo";
  const items = faqs.slice(0, homeFaq.limit);
  return (
    <Section appearanceKey="home.faq" background="soft" aria-labelledby={titleId}>
      <div className="mx-auto max-w-[860px]">
        <h2 id={titleId} className="font-display text-[length:var(--fs-h2)] font-extrabold">
          {homeFaq.title}
        </h2>
        <Accordion
          className="mt-8"
          exclusive="faq-home"
          items={items.map((faq) => ({
            id: `faq-${faq.key}`,
            title: faq.question,
            content: <p>{faq.answer}</p>,
          }))}
        />
        <div className="mt-8">
          <Link
            href={homeFaq.cta.href as Route}
            prefetch={false}
            className={buttonVariants({ variant: "link" })}
          >
            {homeFaq.cta.label}
          </Link>
        </div>
      </div>
      <JsonLd data={faqPageJsonLd(items)} />
    </Section>
  );
}
