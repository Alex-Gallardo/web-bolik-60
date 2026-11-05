"use client";

import { useCallback, useSyncExternalStore, type CSSProperties } from "react";
import { Toaster as Sonner, type ToasterProps } from "sonner";
import { ui } from "@/content/ui";
import { ToneIcon } from "./tone-icon";

/** Escritorio desde md (768 px): abajo a la derecha; en móvil, abajo al centro (docs/08 §4). */
const DESKTOP = "(min-width: 48rem)";

function subscribeDesktop(callback: () => void) {
  const query = window.matchMedia(DESKTOP);
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}
const isDesktop = () => window.matchMedia(DESKTOP).matches;

/** Ícono por tono, siempre junto al texto: el color nunca es el único indicador (docs/08 §4). */
const ICONS: ToasterProps["icons"] = {
  success: <ToneIcon tone="success" className="size-6" />,
  info: <ToneIcon tone="info" className="size-6" />,
  warning: <ToneIcon tone="warning" className="size-6" />,
  error: <ToneIcon tone="error" className="size-6" />,
};

/**
 * Toaster de sonner con los tokens de Bolik (BD-024). Lo importa FeedbackHost
 * al primer toast. Sin los estilos de sonner (unstyled): clases de Tailwind sobre los tokens.
 * La región aria-live de sonner se silencia: FeedbackHost ya anuncia cada toast, con assertive
 * para errores (sonner solo usa polite y, al montarse tarde, su región nacería con el aviso).
 */
export default function Toaster() {
  const desktop = useSyncExternalStore(subscribeDesktop, isDesktop, () => false);
  // La <section> de sonner (forwardRef): sus atributos son fijos y React no los vuelve a escribir.
  const silence = useCallback((section: HTMLElement | null) => {
    section?.setAttribute("aria-live", "off");
  }, []);

  return (
    <Sonner
      ref={silence}
      position={desktop ? "bottom-right" : "bottom-center"}
      visibleToasts={3}
      gap={8}
      // Abajo al centro (menos de 768 px) también sube sobre la barra móvil: sonner solo usa
      // mobileOffset hasta 600 px.
      offset={desktop ? 24 : { bottom: "calc(var(--mobile-bar-h) + 0.75rem)" }}
      // No tapa la barra inferior móvil (docs/08 §4).
      mobileOffset={{ bottom: "calc(var(--mobile-bar-h) + 0.75rem)", left: 16, right: 16 }}
      // Más ancho que el de sonner (356 px): título, acción y cerrar caben sin partir el texto.
      style={{ "--width": "26rem" } as CSSProperties}
      containerAriaLabel={ui.feedback.region}
      closeButton
      icons={ICONS}
      toastOptions={{
        unstyled: true,
        closeButtonAriaLabel: ui.feedback.closeToast,
        classNames: {
          toast:
            "flex w-full items-center gap-3 rounded-lg border-2 border-s-4 border-line bg-paper py-2 ps-4 pe-1 text-ink shadow-md",
          icon: "shrink-0",
          content: "flex min-w-0 flex-1 flex-col gap-0.5 py-1.5",
          title: "font-bold leading-snug",
          description: "text-sm text-muted",
          actionButton:
            "min-h-11 shrink-0 cursor-pointer rounded-md px-3 text-sm font-bold whitespace-nowrap text-blue hover:bg-soft",
          closeButton:
            "order-last grid size-11 shrink-0 cursor-pointer place-items-center rounded-md text-muted hover:bg-soft hover:text-ink [&_svg]:size-4",
          success: "border-s-green",
          info: "border-s-blue",
          warning: "border-s-warning",
          error: "border-s-red",
        },
      }}
    />
  );
}
