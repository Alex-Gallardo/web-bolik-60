import type { Route } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { floatingText } from "@/content/footer";
import { ui } from "@/content/ui";

type FloatingActionsProps = {
  /** Enlace de WhatsApp con el mensaje general; null mientras no haya número en los ajustes. */
  whatsappUrl: string | null;
};

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 20l1.3-3.9A8 8 0 1 1 8 19z" />
      <path d="M9 9.5c.3 2 2.5 4.2 4.5 4.5" />
    </svg>
  );
}

/**
 * Flotantes del sitio (BD-042, docs/06 §2). Server Component, sin JS propio:
 * - Escritorio (≥ 1024 px): botón circular de WhatsApp abajo a la derecha.
 * - Móvil: barra fija abajo con WhatsApp y Cotizar (respeta safe-area-inset-bottom). «Cotizar» es
 *   fijo: el contador de la cotización ya está siempre en el header.
 * - «Volver arriba»: aparece pasada una pantalla (data-scrolled-far, header-scroll.tsx).
 * Se ocultan con CSS (motion.css) cuando hay un sheet o diálogo abierto (Radix bloquea el scroll)
 * y, en pantallas táctiles, con el teclado abierto (un campo con foco). El pie reserva su alto.
 */
export function FloatingActions({ whatsappUrl }: FloatingActionsProps) {
  const t = floatingText;
  return (
    <div className="floating-actions">
      <a href="#top" aria-label={t.backToTop} className="floating-item floating-top">
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          focusable="false"
          className="size-6"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 19V5M5.5 11.5 12 5l6.5 6.5" />
        </svg>
      </a>
      {whatsappUrl ? (
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${t.whatsapp} ${ui.header.newTab}`}
          className="floating-item floating-whatsapp"
        >
          <WhatsAppIcon className="size-7" />
        </a>
      ) : null}
      <nav aria-label={t.label} className="floating-item mobile-bar">
        {whatsappUrl ? (
          <Button asChild variant="whatsapp" className="flex-1">
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
              <WhatsAppIcon className="size-5" />
              {t.whatsappShort}
              <span className="sr-only"> {ui.header.newTab}</span>
            </a>
          </Button>
        ) : null}
        <Button asChild className="flex-1">
          <Link href={ui.header.cta.href as Route} prefetch={false}>
            {ui.header.cta.label}
          </Link>
        </Button>
      </nav>
    </div>
  );
}
