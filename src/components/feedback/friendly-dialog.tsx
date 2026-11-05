"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useRef, type CSSProperties } from "react";
import { Illustration } from "@/components/brand/illustration";
import { Button } from "@/components/ui/button";
import { ui } from "@/content/ui";
import {
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

type FriendlyDialogProps = {
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
  const safeAction = useRef<HTMLButtonElement>(null);
  const block = (event: Event) => {
    if (busy) event.preventDefault();
  };

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next && !busy) closeDialog();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay fixed inset-0 z-(--z-modal) bg-ink/60" />
        <Dialog.Content
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
          className="dialog-content fixed inset-x-0 bottom-0 z-(--z-modal) flex max-h-[90dvh] flex-col items-center gap-4 overflow-y-auto rounded-t-xl bg-paper px-6 pt-8 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-center text-ink shadow-lg sm:inset-0 sm:m-auto sm:h-fit sm:w-[min(28rem,calc(100%-2rem))] sm:rounded-xl sm:p-8"
        >
          {/* key: con un diálogo nuevo, el ícono vuelve a animarse. */}
          <div key={request.id} className="relative flex justify-center">
            <KindIcon kind={request.kind} />
          </div>
          {request.celebrate ? <Confetti key={`c${request.id}`} /> : null}
          <Dialog.Title className="text-2xl leading-tight sm:text-[1.75rem]">
            {request.title}
          </Dialog.Title>
          <Dialog.Description className="max-w-[var(--measure)] text-[length:var(--fs-body)] text-muted">
            {request.body}
          </Dialog.Description>
          {request.note ? <p className="text-sm text-muted">{request.note}</p> : null}
          <div className="mt-2 flex w-full flex-col gap-3">
            <Button
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
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
