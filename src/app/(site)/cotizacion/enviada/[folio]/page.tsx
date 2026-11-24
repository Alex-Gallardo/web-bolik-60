import type { Route } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { cache } from "react";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Section } from "@/components/layout/section";
import { Button } from "@/components/ui/button";
import { breadcrumbsText } from "@/content/breadcrumbs";
import { quotePage } from "@/content/quote";
import { quoteSentPage as t } from "@/content/quote-sent";
import { buildMetadata } from "@/features/seo/metadata";
import { formatNumber } from "@/lib/format";
import { whatsappEventData, whatsappMessage, whatsappUrl } from "@/lib/whatsapp";
import { getSiteSettings } from "@/server/data/content";
import { getQuoteSummary } from "@/server/data/quote-requests";
import { readQuoteReceipts } from "@/server/quote-receipts";

const QUOTE_PATH = "/cotizacion";

type Params = PageProps<"/cotizacion/enviada/[folio]">["params"];

/**
 * Ruta que espera a la petición (Cache Components, «[block]»): se pinta completa en el servidor
 * cada vez, sin caparazón ni bloque oculto del streaming. Así se ve sin JavaScript (CLAUDE.md) y no
 * se guarda una versión por cada folio que alguien escriba en la URL.
 */
export const instant = false;

/** Cache Components exige al menos un valor de ejemplo; con `instant = false` no se prerenderiza. */
export async function generateStaticParams() {
  return [{ folio: "COT-2026-000001" }];
}

/**
 * El folio de la URL y su resumen, si es de este navegador (`server/quote-receipts.ts`). Una vez
 * por petición: lo usan la página y su título.
 */
const loadReceipt = cache(async (params: Params) => {
  // Siempre en la petición: descifrar la cookie usa la hora (iron-session).
  await connection();
  const { folio } = await params;
  const receipts = await readQuoteReceipts();
  const summary = receipts.includes(folio) ? await getQuoteSummary(folio) : null;
  return { folio, summary };
});

/** Página de utilidad: noindex, follow (CLAUDE.md, docs/10 §3); canónica la de /cotizacion. */
export async function generateMetadata({ params }: PageProps<"/cotizacion/enviada/[folio]">) {
  const { summary } = await loadReceipt(params);
  return buildMetadata({
    // El título dice lo mismo que el h1 de cada caso.
    title: summary ? t.title : t.otherTitle,
    description: t.metaDescription,
    path: QUOTE_PATH,
    noindex: true,
  });
}

/**
 * Confirmación de la cotización (BD-075, docs/06 §3.17): folio, a quién le llega, las líneas y los
 * siguientes pasos. El resumen solo se ve si el folio está en la cookie del navegador que la envió;
 * con otro folio, un mensaje sin datos. Sin JSON-LD (noindex) y sin JavaScript propio.
 */
export default async function QuoteSentPage({ params }: PageProps<"/cotizacion/enviada/[folio]">) {
  const [{ folio, summary }, settings] = await Promise.all([
    loadReceipt(params),
    getSiteSettings(),
  ]);
  // Next entrega el segmento tal cual (codificado): sirve de ruta sin volver a codificarlo.
  const path = `/cotizacion/enviada/${folio}`;
  const whatsapp = settings.whatsappNumber
    ? whatsappUrl(
        settings.whatsappNumber,
        whatsappMessage(
          summary ? { context: "sent", folio: summary.folio } : { context: "general" },
        ),
      )
    : null;

  return (
    <Section spacing="sm">
      {/* Migas sin JSON-LD: es noindex (nota de BD-093). */}
      <Breadcrumbs
        crumbs={[
          breadcrumbsText.home,
          { name: quotePage.title, path: QUOTE_PATH },
          { name: t.crumb, path },
        ]}
        structuredData={false}
        prefetch={false}
      />
      <div className="mt-4 flex max-w-[var(--measure)] flex-col gap-4">
        {summary ? (
          <>
            <h1 className="text-[length:var(--fs-h1)]">{t.title}</h1>
            <p className="text-lg">
              {t.folioIntro} <strong className="whitespace-nowrap tnum">{summary.folio}</strong>.{" "}
              {t.nextStep(summary.departmentName)}
            </p>
          </>
        ) : (
          <>
            <h1 className="text-[length:var(--fs-h1)]">{t.otherTitle}</h1>
            <p className="text-lg">
              {t.otherBody}
              {whatsapp ? ` ${t.otherWhatsApp}` : null}
            </p>
          </>
        )}
      </div>

      {summary && summary.items.length > 0 ? (
        <section aria-labelledby="productos-enviados" className="mt-8 max-w-3xl">
          <h2 id="productos-enviados" className="text-[length:var(--fs-h3)]">
            {t.itemsTitle}
          </h2>
          <ul className="mt-4 flex flex-col divide-y-2 divide-line rounded-lg border-2 border-line bg-paper">
            {summary.items.map((item, index) => (
              <li
                key={index}
                className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4"
              >
                <span>{item.description}</span>
                <span className="font-bold whitespace-nowrap tnum">
                  {formatNumber(item.quantity)} {item.unitLabel}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        {whatsapp ? (
          <Button asChild variant="whatsapp">
            <a
              href={whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              {...whatsappEventData(summary ? "quote" : "general")}
            >
              {t.whatsapp}
            </a>
          </Button>
        ) : null}
        <Button asChild variant={whatsapp ? "outline" : "primary"}>
          <Link href={t.keepBrowsing.href as Route} prefetch={false}>
            {t.keepBrowsing.label}
          </Link>
        </Button>
      </div>
    </Section>
  );
}
