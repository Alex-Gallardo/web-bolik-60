"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cx } from "class-variance-authority";
import type { ComponentProps, ReactNode } from "react";
import { CloseButton } from "./dialog";

/**
 * Sheet / drawer (docs/08 §2, BD-025): Radix Dialog pegado a un borde. A-08: desliza desde su
 * lado (420 ms al entrar, 240 ms al salir) con el fondo en opacidad; con movimiento reducido,
 * solo opacidad. Foco atrapado, Escape cierra y el foco vuelve al Trigger.
 *
 * `auto` (por defecto): abajo en móvil, a la derecha desde md (menú, cotización, filtros).
 * Radix Dialog pesa ~10 KB gzip: en piezas de todas las páginas, cárgalo al primer uso (docs/04).
 */
export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;

export type SheetSide = "auto" | "right" | "left" | "bottom";

const SIDE: Record<SheetSide, string> = {
  // Esquinas explícitas: rounded-t y rounded-l tocarían la misma esquina y el orden decidiría.
  auto: "inset-x-0 bottom-0 max-h-[90dvh] rounded-t-xl md:inset-x-auto md:inset-y-0 md:right-0 md:h-dvh md:max-h-none md:w-[26rem] md:rounded-tr-none md:rounded-bl-xl",
  right: "inset-y-0 right-0 h-dvh w-[min(26rem,100%)] rounded-l-xl",
  left: "inset-y-0 left-0 h-dvh w-[min(26rem,100%)] rounded-r-xl",
  bottom: "inset-x-0 bottom-0 max-h-[90dvh] rounded-t-xl",
};

type SheetContentProps = Omit<ComponentProps<typeof DialogPrimitive.Content>, "title"> & {
  side?: SheetSide;
  /** Título visible (h2): nombre accesible del sheet. */
  title: ReactNode;
  description?: ReactNode;
  /** Pie fijo (botones de acción), fuera de la zona con scroll. */
  footer?: ReactNode;
  children: ReactNode;
};

export function SheetContent({
  side = "auto",
  title,
  description,
  footer,
  className,
  children,
  ...props
}: SheetContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="dialog-overlay fixed inset-0 z-(--z-overlay) bg-ink/60" />
      <DialogPrimitive.Content
        data-side={side}
        className={cx(
          "sheet-content fixed z-(--z-drawer) flex flex-col bg-paper text-ink shadow-lg",
          SIDE[side],
          className,
        )}
        {...props}
      >
        <div className="flex items-start justify-between gap-3 border-b-2 border-line py-3 ps-6 pe-3">
          <div className="flex flex-col gap-1 py-2">
            <DialogPrimitive.Title className="text-xl leading-tight">{title}</DialogPrimitive.Title>
            {description ? (
              <DialogPrimitive.Description className="text-sm text-muted">
                {description}
              </DialogPrimitive.Description>
            ) : null}
          </div>
          <CloseButton />
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain px-6 py-5">{children}</div>
        {footer ? (
          <div className="border-t-2 border-line px-6 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {footer}
          </div>
        ) : null}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
