"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cx } from "class-variance-authority";
import type { ComponentProps, ReactNode } from "react";
import { ui } from "@/content/ui";

/**
 * Diálogo modal (docs/08 §2, BD-025) sobre Radix Dialog: foco atrapado, Escape y el fondo cierran,
 * el foco vuelve al Trigger. Bottom sheet en móvil y centrado desde sm (A-09, CSS en motion.css:
 * Radix espera la animación de salida). FriendlyDialog se arma sobre este.
 *
 * Radix Dialog pesa ~10 KB gzip: en piezas de todas las páginas (menú del header), cárgalo al
 * primer uso (docs/04).
 */
export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

/** Fondo oscuro de diálogos y sheets. */
export function DialogOverlay({
  className,
  ...props
}: ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      className={cx("dialog-overlay fixed inset-0 z-(--z-modal) bg-ink/60", className)}
      {...props}
    />
  );
}

/** Botón × de 44 px con nombre accesible («Cerrar»). */
export function CloseButton({ className }: { className?: string }) {
  return (
    <DialogPrimitive.Close
      aria-label={ui.overlays.close}
      className={cx(
        "grid size-11 shrink-0 cursor-pointer place-items-center rounded-md text-muted hover:bg-soft hover:text-ink",
        className,
      )}
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        focusable="false"
        className="size-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      >
        <path d="m6 6 12 12M18 6 6 18" />
      </svg>
    </DialogPrimitive.Close>
  );
}

type DialogContentProps = ComponentProps<typeof DialogPrimitive.Content> & {
  /** Muestra el × arriba a la derecha (por defecto sí; FriendlyDialog lo apaga: tiene sus botones). */
  showClose?: boolean;
  children: ReactNode;
};

export function DialogContent({
  className,
  showClose = true,
  children,
  ...props
}: DialogContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogOverlay />
      <DialogPrimitive.Content
        className={cx(
          "dialog-content fixed inset-x-0 bottom-0 z-(--z-modal) flex max-h-[90dvh] flex-col gap-4 overflow-y-auto rounded-t-xl bg-paper px-6 pt-8 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-ink shadow-lg sm:inset-0 sm:m-auto sm:h-fit sm:w-[min(28rem,calc(100%-2rem))] sm:rounded-xl sm:p-8",
          className,
        )}
        {...props}
      >
        {children}
        {showClose ? <CloseButton className="absolute top-3 right-3" /> : null}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

/** Título del diálogo (h2). Radix lo exige: sin título no hay nombre accesible. */
export function DialogTitle({ className, ...props }: ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      className={cx("text-2xl leading-tight sm:text-[1.75rem]", className)}
      {...props}
    />
  );
}

export function DialogDescription({
  className,
  ...props
}: ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      className={cx("text-[length:var(--fs-body)] text-muted", className)}
      {...props}
    />
  );
}
