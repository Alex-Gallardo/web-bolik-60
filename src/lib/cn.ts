import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * tailwind-merge con los nombres propios del tema (src/app/globals.css). Los colores de marca y los
 * radios ya se reconocen por su prefijo; solo hay que declarar los valores que no son estándar.
 */
const twMerge = extendTailwindMerge({
  extend: {
    theme: { shadow: ["kids"] },
  },
});

/**
 * Une clases condicionales y resuelve conflictos de Tailwind (la última gana).
 * - Tamaños arbitrarios siempre con la pista length: (`text-[length:var(--fs-h1)]`); sin ella se
 *   toman como color y borran `text-ink`.
 * - `eyebrow` y `container-site` son utilidades propias: cn no las combina con `text-*` / `px-*`
 *   (gana la que quede después en el CSS, no la última del cn).
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
