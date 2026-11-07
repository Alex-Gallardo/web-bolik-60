"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { PAGE_ID } from "@/components/layout/page-id";
import { feedback } from "@/content/feedback";

type ErrorScreenProps = {
  /** El valor que llegó al error boundary (`unknown` en Next 16.4). */
  error: unknown;
  retry: () => void;
};

/** Código de un error del servidor (digest de Next), el mismo que queda en el log. */
export function errorReference(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null || !("digest" in error)) return undefined;
  const digest = String((error as { digest: unknown }).digest);
  return digest || undefined;
}

const noSubscribe = () => () => {};
/**
 * Contenedor de la página: el layout de (site) deja ahí el contacto en data-contact-* (BD-046). El
 * elemento es una referencia estable para useSyncExternalStore; en el servidor y en global-error
 * (sin layout) no hay.
 */
const pageElement = () => document.getElementById(PAGE_ID);

/**
 * Pantalla amigable de error (docs/17 §404 y 500). La usan error.tsx y global-error.tsx.
 * El foco pasa al título al aparecer: el elemento que lo tenía pudo desaparecer con el error, y el
 * lector de pantalla anuncia el título en lugar de quedarse en <body>.
 */
export function ErrorScreen({ error, retry }: ErrorScreenProps) {
  const text = feedback.system.genericError;
  const reference = errorReference(error);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const contact = useSyncExternalStore(noSubscribe, pageElement, () => null)?.dataset;
  // Solo enlaces seguros: WhatsApp (https://wa.me) y tel:.
  const whatsapp = contact?.contactWhatsapp?.startsWith("https://wa.me/")
    ? contact.contactWhatsapp
    : undefined;
  const tel = contact?.contactTel?.startsWith("tel:") ? contact.contactTel : undefined;

  useEffect(() => titleRef.current?.focus(), []);

  return (
    <section className="container-site flex flex-1 flex-col items-start justify-center gap-4 py-16">
      <h1 ref={titleRef} tabIndex={-1} className="outline-none">
        {text.title}
      </h1>
      <p className="max-w-[var(--measure)] text-[length:var(--fs-lead)] text-muted">
        {whatsapp ? text.body : text.bodyNoWhatsapp}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={retry}
          className="press min-h-11 rounded-md bg-blue px-6 font-bold text-paper"
        >
          {text.primary}
        </button>
        {whatsapp && (
          <a
            href={whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="press inline-flex min-h-11 items-center rounded-md border-2 border-blue px-6 font-bold text-blue no-underline"
          >
            {text.whatsapp}
          </a>
        )}
        {tel && contact?.contactPhone && (
          <a href={tel} className="inline-flex min-h-11 items-center tnum">
            {text.call(contact.contactPhone)}
          </a>
        )}
      </div>
      {reference && <p className="text-sm text-muted tnum">{text.reference(reference)}</p>}
    </section>
  );
}
