import { Section } from "@/components/layout/section";
import { QuotePageIsland } from "@/components/quote/quote-page-island";
import { quotePage } from "@/content/quote";
import { buildMetadata } from "@/features/seo/metadata";
import { formatPhone } from "@/lib/format";
import { whatsappMessage, whatsappUrl } from "@/lib/whatsapp";
import { getSiteSettings } from "@/server/data/content";
import { listDepartments } from "@/server/data/stores";

const PATH = "/cotizacion";

/** Página de utilidad: noindex, follow (CLAUDE.md, docs/10 §3). */
export const metadata = buildMetadata({
  title: quotePage.metaTitle,
  description: quotePage.metaDescription,
  path: PATH,
  noindex: true,
});

/**
 * «Mi cotización» (docs/06 §3.16, BD-072): estática; la lista y el formulario son una isla cliente
 * porque la cotización vive en el navegador (BD-070). Los departamentos y el número de WhatsApp
 * llegan del servidor. Sin JavaScript no hay lista que enviar: lo dice el aviso de <noscript>.
 * Sin JSON-LD: no es una página para buscadores.
 */
export default async function QuotePage() {
  const [departments, settings] = await Promise.all([listDepartments(), getSiteSettings()]);
  // Helper de lib/whatsapp: null sin número válido (entonces el aviso no promete WhatsApp).
  const whatsapp = settings.whatsappNumber
    ? whatsappUrl(settings.whatsappNumber, whatsappMessage({ context: "general" }))
    : null;
  return (
    <Section spacing="sm">
      <h1 className="text-[length:var(--fs-h1)]">{quotePage.title}</h1>
      <noscript>
        <p className="mt-4 rounded-lg border-2 border-s-4 border-line border-s-warning bg-paper px-4 py-3">
          {quotePage.noScript}
          {whatsapp ? (
            <>
              {" "}
              {quotePage.noScriptWhatsApp}{" "}
              <a href={whatsapp} target="_blank" rel="noopener noreferrer">
                {formatPhone(settings.whatsappNumber!)}
              </a>
            </>
          ) : null}
          .
        </p>
      </noscript>
      {/* Alto reservado: al hidratar, «Cargando…» pasa a la lista o al estado vacío sin empujar el
          pie (CLS ≤ 0.05; la lista vive en el navegador y el servidor no la conoce). */}
      <div className="mt-8 min-h-[60dvh]">
        <QuotePageIsland
          departments={departments.map(({ slug, name }) => ({ slug, name }))}
          whatsappPhone={settings.whatsappNumber}
          kitsEnabled={settings.kitsEnabled}
        />
      </div>
    </Section>
  );
}
