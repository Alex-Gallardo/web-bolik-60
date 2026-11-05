"use client";

import { Suspense, lazy, useEffect, useSyncExternalStore } from "react";
import { getState, setConnection, subscribe, type ConnectionMessages } from "./feedback-store";
import { ToneIcon } from "./tone-icon";

// Solo se descargan cuando hacen falta (docs/12 §2: lo que carga al interactuar no cuenta como JS
// inicial). Se precargan con la primera interacción para que el primer toast no espere la red.
// React.lazy y no next/dynamic: nunca se dibujan en el servidor (aparecen tras una acción) y así
// el JS de todas las páginas no carga la maquinaria de next/dynamic.
const loadToaster = () => import("./toaster");
const loadDialog = () => import("./friendly-dialog");
const Toaster = lazy(loadToaster);
const FriendlyDialog = lazy(loadDialog);

/**
 * Anfitrión del feedback (docs/08 §4, BD-024), montado una vez en el layout. Pesa poco: dos
 * regiones aria-live que existen desde el inicio (si nacieran con el aviso, el lector no lo
 * leería), el aviso de sin conexión y el montaje perezoso del toaster y del diálogo.
 *
 * Los textos de conexión llegan como props desde el layout (servidor): así content/feedback.ts no
 * entra en el JS de todas las páginas. El aviso de sin conexión lo dibuja este componente y no sonner: sin red no se podría descargar
 * el toaster. Va arriba al centro para no chocar con la pila de toasts de abajo.
 */
export function FeedbackHost({ messages }: { messages: ConnectionMessages }) {
  const state = useSyncExternalStore(subscribe, getState, getState);

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
      void loadToaster();
      void loadDialog();
    };
    const options = { once: true, passive: true, capture: true } as const;
    window.addEventListener("pointerdown", warm, options);
    window.addEventListener("keydown", warm, options);
    return () => {
      window.removeEventListener("pointerdown", warm, options);
      window.removeEventListener("keydown", warm, options);
    };
  }, []);

  const { announcement } = state;
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
      {state.offline ? (
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
      {/* Un Suspense para cada uno: si compartieran, el toaster se ocultaría mientras carga el diálogo. */}
      <Suspense fallback={null}>{state.toasterRequested ? <Toaster /> : null}</Suspense>
      <Suspense fallback={null}>
        {state.dialog ? (
          <FriendlyDialog request={state.dialog} open={state.dialogOpen} busy={state.dialogBusy} />
        ) : null}
      </Suspense>
    </>
  );
}
