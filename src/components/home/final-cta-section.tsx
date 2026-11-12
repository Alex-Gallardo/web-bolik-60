import type { Route } from "next";
import Link from "next/link";
import { Section } from "@/components/layout/section";
import { buttonVariants } from "@/components/ui/button-variants";
import { finalCta } from "@/content/home";
import { ui } from "@/content/ui";

/**
 * Cierre de la home (docs/06 §3.1 sección 13, BD-054): «¿Compras por mayor?» con Armar mi
 * cotización (quote_open; /cotizacion hasta el drawer de BD-071) y WhatsApp. Sin número válido
 * en los ajustes (whatsappUrl = null) no hay botón de WhatsApp, como en el header.
 */
export function FinalCtaSection({ whatsappUrl }: { whatsappUrl: string | null }) {
  const titleId = "cta-final-titulo";
  return (
    <Section appearanceKey="home.final-cta" background="brand" aria-labelledby={titleId}>
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 text-center">
        <h2 id={titleId} className="font-display text-[length:var(--fs-h2)] font-extrabold">
          {finalCta.title}
        </h2>
        <p className="text-[length:var(--fs-lead)] text-text">{finalCta.text}</p>
        <div className="mt-4 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <Link
            href={finalCta.quote.href as Route}
            prefetch={false}
            className={buttonVariants({ variant: "accent", block: true })}
            data-event="quote_open"
          >
            {finalCta.quote.label}
          </Link>
          {whatsappUrl && (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ variant: "whatsapp", block: true })}
              data-event="whatsapp_open"
              data-context="general"
            >
              {finalCta.whatsapp}
              <span className="sr-only">{` ${ui.cards.newTab}`}</span>
            </a>
          )}
        </div>
      </div>
    </Section>
  );
}
