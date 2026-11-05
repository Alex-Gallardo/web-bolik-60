"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { Illustration } from "@/components/brand/illustration";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { ui } from "@/content/ui";
import {
  announce,
  closeDialog,
  runPrimary,
  runSecondary,
  takeReturnFocus,
  type DialogKind,
  type DialogRequest,
} from "./feedback-store";

/** Éxito (A-60): círculo verde con rebote y un check que se dibuja. Estático con movimiento reducido. */
function SuccessIcon() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false" className="size-16">
      <circle
        className="dialog-pop fill-green-50 stroke-green"
        strokeWidth="3"
        cx="32"
        cy="32"
        r="29"
      />
      <path
        className="dialog-check fill-none stroke-green"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        d="m19 33 9 9 17-19"
      />
    </svg>
  );
}

function KindIcon({ kind }: { kind: DialogKind }) {
  if (kind === "success") return <SuccessIcon />;
  return (
    <Illustration
      name={kind === "error" ? "error-cloud" : "question"}
      className="dialog-pop size-16"
    />
  );
}

/** Confeti ligero: 12 piezas de CSS (A-60, escuelas). Oculto con movimiento reducido. */
const CONFETTI = ["bg-yellow", "bg-red", "bg-blue", "bg-green"] as const;
function Confetti() {
  return (
    <span aria-hidden="true" className="confetti pointer-events-none absolute inset-x-0 top-12">
      {Array.from({ length: 12 }, (_, i) => (
        <span
          key={i}
          className={`confetti-piece ${CONFETTI[i % CONFETTI.length]}`}
          style={
            {
              "--angle": `${i * 30}deg`,
              "--delay": `${(i % 3) * 40}ms`,
            } as CSSProperties
          }
        />
      ))}
    </span>
  );
}

export type FriendlyDialogProps = {
  request: DialogRequest;
  open: boolean;
  busy: boolean;
};

/**
 * Diálogo amigable (docs/08 §4, BD-024) sobre Radix Dialog: ícono de 64 px, título (h2), texto y
 * hasta dos acciones. Bottom sheet en móvil, centrado desde sm (A-09, con CSS: Radix espera la
 * animación de salida). Foco atrapado; Escape y el fondo cierran salvo durante el envío; al
 * cerrar, el foco vuelve al botón que lo abrió. Lo monta FeedbackHost (uno a la vez).
 */
export default function FriendlyDialog({ request, open, busy }: FriendlyDialogProps) {
  const primaryAction = useRef<HTMLButtonElement>(null);
  const safeAction = useRef<HTMLButtonElement>(null);
  const shownId = useRef(request.id);
  const block = (event: Event) => {
    if (busy) event.preventDefault();
  };

  // Un diálogo reemplaza a otro abierto (reintento → éxito): Radix no vuelve a montar el contenido,
  // así que ni mueve el foco ni el lector se entera. Se repite aquí lo que hace al abrir.
  useEffect(() => {
    if (shownId.current === request.id) return;
    shownId.current = request.id;
    if (!open) return;
    (request.destructive && safeAction.current ? safeAction : primaryAction).current?.focus();
    announce(`${request.title}. ${request.body}`);
  }, [request, open]);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !busy) closeDialog();
      }}
    >
      <DialogContent
        showClose={false}
        aria-busy={busy || undefined}
        onEscapeKeyDown={block}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          takeReturnFocus()?.focus();
        }}
        onInteractOutside={block}
        // Confirmación destructiva: el foco empieza en «Cancelar», no en «Sí, eliminar».
        onOpenAutoFocus={(event) => {
          if (request.destructive && safeAction.current) {
            event.preventDefault();
            safeAction.current.focus();
          }
        }}
        className="items-center text-center"
      >
        {/* key: con un diálogo nuevo, el ícono vuelve a animarse. */}
        <div key={request.id} className="relative flex justify-center">
          <KindIcon kind={request.kind} />
        </div>
        {request.celebrate ? <Confetti key={`c${request.id}`} /> : null}
        <DialogTitle>{request.title}</DialogTitle>
        <DialogDescription className="max-w-[var(--measure)]">{request.body}</DialogDescription>
        {request.note ? <p className="text-sm text-muted">{request.note}</p> : null}
        <div className="mt-2 flex w-full flex-col gap-3">
          <Button
            ref={primaryAction}
            variant={request.destructive ? "danger" : "primary"}
            className="w-full"
            loading={busy}
            onClick={() => void runPrimary()}
          >
            {request.primary ?? ui.feedback.ok}
          </Button>
          {request.secondary ? (
            <Button
              ref={safeAction}
              variant="outline"
              className="w-full"
              aria-disabled={busy || undefined}
              onClick={() => runSecondary()}
            >
              {request.secondary}
            </Button>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
