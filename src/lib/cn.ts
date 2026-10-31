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

/** Une clases condicionales y resuelve conflictos de Tailwind (la última gana). */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
