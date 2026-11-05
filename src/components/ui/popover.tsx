"use client";

import * as PopoverPrimitive from "@radix-ui/react-popover";
import { cx } from "class-variance-authority";
import type { ComponentProps } from "react";

/**
 * Popover (BD-025) sobre Radix Popover: se posiciona junto al Trigger y se acomoda al borde de la
 * pantalla. Escape o un clic fuera lo cierran y el foco vuelve al Trigger. Aparece con opacidad y
 * una escala corta (solo opacidad con movimiento reducido). Para contenido no esencial: lo
 * importante va en la página, no escondido aquí.
 */
export const Popover = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;
export const PopoverClose = PopoverPrimitive.Close;

export function PopoverContent({
  className,
  sideOffset = 8,
  collisionPadding = 16,
  ...props
}: ComponentProps<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        sideOffset={sideOffset}
        collisionPadding={collisionPadding}
        className={cx(
          "popover-content z-(--z-modal) w-[min(20rem,calc(100vw-2rem))] rounded-lg border-2 border-line bg-paper p-4 text-ink shadow-md",
          className,
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
}
