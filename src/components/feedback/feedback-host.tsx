"use client";

import { useEffect, useState, useSyncExternalStore, type ComponentType } from "react";
import {
  announce,
  clearAnnouncement,
  closeDialog,
  getServerState,
  getState,
  retryableImport,
  setConnection,
  subscribe,
  type ConnectionMessages,
} from "./feedback-store";
import type { FriendlyDialogProps } from "./friendly-dialog";
import { ToneIcon } from "./tone-icon";

// Solo se descargan cuando hacen falta (docs/12 §2: lo que carga al interactuar no cuenta como JS
// inicial) y se precargan con la primera interacción. No usa next/dynamic ni React.lazy: si la
// descarga falla (sin red, o una pestaña abierta durante un despliegue) lanzarían el error al
// dibujar y, como este componente está en el layout, se caería la página. Aquí el componente se
// monta solo cuando su import() resolvió; si falla, se reintenta con el próximo pedido o al
// volver la conexión.
const loadToaster = retryableImport(() => import("./toaster"));
const loadDialog = retryableImport(() => import("./friendly-dialog"));

/** Tiempo para que el lector termine de leer un anuncio antes de vaciar la región. */
const ANNOUNCEMENT_MS = 7000;

/**
 * Anfitrión del feedback (docs/08 §4, BD-024), montado una vez en el layout. Pesa poco: dos
 * regiones aria-live que existen desde el inicio (si nacieran con el aviso, el lector no lo
 * leería), el aviso de sin conexión y el montaje perezoso del toaster y del diálogo.
 *
 * Los textos de conexión llegan como props desde el layout (servidor): así content/feedback.ts no
 * entra en el JS de todas las páginas. El aviso de sin conexión lo dibuja este componente y no
 * sonner (sin red no se podría descargar); va arriba al centro para no chocar con los toasts.
 */
export function FeedbackHost({ messages }: { messages: ConnectionMessages }) {
  const state = useSyncExternalStore(subscribe, getState, getServerState);
  const [Toaster, setToaster] = useState<ComponentType | null>(null);
  const [Dialog, setDialog] = useState<ComponentType<FriendlyDialogProps> | null>(null);

  useEffect(() => {
    const offline = () => setConnection(false, messages);
    const online = () => setConnection(true, messages);
    if (!navigator.onLine) offline();
    window.addEventListener("offline", offline);
    window.addEventListener("online", online);
    return () => {
      window.removeEventListener("offline", offline);
      window.removeEventListener("online", online);
    };
  }, [messages]);

  // Precarga en la primera interacción (no en la carga: eso sí contaría como JS inicial).
  useEffect(() => {
    const warm = () => {
      loadToaster().catch(() => {});
      loadDialog().catch(() => {});
    };
    const options = { once: true, passive: true, capture: true } as const;
    window.addEventListener("pointerdown", warm, options);
    window.addEventListener("keydown", warm, options);
    return () => {
      window.removeEventListener("pointerdown", warm, options);
      window.removeEventListener("keydown", warm, options);
    };
  }, []);

  // Toaster: se monta al primer toast; si no se pudo descargar, lo intenta de nuevo con el
  // siguiente toast o cuando vuelve la conexión (el toast pendiente se ve entonces: sonner lo guarda).
  const { toastRequests, offline } = state;
  useEffect(() => {
    if (toastRequests === 0 || Toaster) return;
    let active = true;
    loadToaster()
      .then((module) => active && setToaster(() => module.default))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [toastRequests, offline, Toaster]);

  // Diálogo: si no se pudo descargar, su texto se anuncia y el pedido se descarta (no queda un
  // diálogo «abierto» invisible que bloquee el siguiente).
  const dialogId = state.dialog?.id;
  useEffect(() => {
    if (dialogId === undefined || Dialog) return;
    let active = true;
    loadDialog()
      .then((module) => active && setDialog(() => module.default))
      .catch(() => {
        const pending = getState().dialog;
        if (!active || pending?.id !== dialogId) return;
        announce(`${pending.title}. ${pending.body}`, "assertive");
        closeDialog();
      });
    return () => {
      active = false;
    };
  }, [dialogId, Dialog]);

  // Vacía la región cuando ya se leyó: no queda texto viejo para quien recorre la página.
  const { announcement } = state;
  useEffect(() => {
    if (!announcement) return;
    const timer = setTimeout(() => clearAnnouncement(announcement.id), ANNOUNCEMENT_MS);
    return () => clearTimeout(timer);
  }, [announcement]);

  const polite = announcement?.politeness === "polite" ? announcement : null;
  const assertive = announcement?.politeness === "assertive" ? announcement : null;

  return (
    <>
      {/* Cada anuncio es un nodo nuevo (key): el lector lo lee aunque el texto se repita. */}
      <div aria-live="polite" aria-atomic="true" className="sr-only" data-feedback-live="polite">
        {polite ? <p key={polite.id}>{polite.text}</p> : null}
      </div>
      <div
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
        data-feedback-live="assertive"
      >
        {assertive ? <p key={assertive.id}>{assertive.text}</p> : null}
      </div>
      {offline ? (
        // Ya anunciado por la región polite al perder la conexión; queda en la página para quien
        // la recorra después.
        <div
          data-offline-notice
          className="notice-in fixed inset-x-4 top-[calc(var(--header-h)+0.75rem)] z-(--z-toast) mx-auto flex max-w-[26rem] items-center gap-3 rounded-lg border-2 border-s-4 border-line border-s-warning bg-paper px-4 py-3 text-ink shadow-md"
        >
          <ToneIcon tone="warning" className="size-6" />
          <div className="flex flex-col gap-0.5">
            <p className="leading-snug font-bold">{messages.offline.title}</p>
            <p className="text-sm text-muted">{messages.offline.description}</p>
          </div>
        </div>
      ) : null}
      {Toaster ? <Toaster /> : null}
      {Dialog && state.dialog ? (
        <Dialog request={state.dialog} open={state.dialogOpen} busy={state.dialogBusy} />
      ) : null}
    </>
  );
}
