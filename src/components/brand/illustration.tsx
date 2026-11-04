import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Ilustraciones de estados (docs/08 §5, BD-027): trazo de tinta azul y un acento amarillo, en
 * línea y con los colores de los tokens (clases stroke- y fill- de Tailwind, sin hex). Cada una
 * pesa menos de 3 KB. Son decorativas: el diálogo o la página dicen el mensaje; con `title` se
 * anuncian. El significado nunca depende del amarillo (contraste bajo sobre blanco): es acento.
 */

export type IllustrationName = "success" | "error" | "empty" | "no-results" | "offline";

const INK = "fill-none stroke-blue";
const ACCENT = "fill-none stroke-yellow";

const DRAWINGS: Record<IllustrationName, ReactNode> = {
  // Éxito: check dentro de un círculo, con un trazo amarillo debajo.
  success: (
    <>
      <path className={ACCENT} strokeWidth="6" d="M26 100c18-6 46-6 68 0" />
      <circle className={INK} cx="60" cy="54" r="34" />
      <path className={INK} d="m44 55 11 11 22-24" />
    </>
  ),
  // Error y 404: lapicero sin tinta, con un trazo que se corta.
  error: (
    <>
      <path className={INK} d="m82 18 20 20-50 50-26 6 6-26z" />
      <path className={INK} d="m74 26 20 20M38 70l12 12" />
      <path className={ACCENT} strokeWidth="5" d="M14 104h14m10 0h8m10 0h4" />
    </>
  ),
  // Vacío: cuaderno abierto con renglones y un separador amarillo.
  empty: (
    <>
      <path
        className={INK}
        d="M60 30c-12-8-28-10-42-8v66c14-2 30 0 42 8 12-8 28-10 42-8V22c-14-2-30 0-42 8zm0 0v66"
      />
      <path className={INK} strokeWidth="3" d="M28 44h20M28 56h20M72 44h20M72 56h14" />
      <path className="fill-yellow stroke-yellow" strokeWidth="2" d="M80 22v24l6-5 6 5V22z" />
    </>
  ),
  // Sin resultados: lupa con signo de pregunta.
  "no-results": (
    <>
      <circle className={INK} cx="52" cy="52" r="30" />
      <path className={INK} d="m74 74 26 26" />
      <path className={ACCENT} strokeWidth="5" d="M34 42a20 20 0 0 1 10-10" />
      <path className={INK} d="M45 45a8 8 0 1 1 10 8c-2 1-3 3-3 6" />
      <circle className="fill-blue" cx="52" cy="68" r="3" />
    </>
  ),
  // Sin conexión: nube cortada por una línea.
  offline: (
    <>
      <path className={INK} d="M36 86h48a18 18 0 0 0 0-36 26 26 0 0 0-50-4 20 20 0 0 0 2 40z" />
      <path className={ACCENT} strokeWidth="6" d="M22 22l76 76" />
    </>
  ),
};

type IllustrationProps = {
  name: IllustrationName;
  /** Si la ilustración aporta información, su texto para lectores de pantalla. */
  title?: string;
  className?: string;
};

export function Illustration({ name, title, className }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 120 120"
      strokeWidth="4"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("size-28", className)}
      {...(title
        ? { role: "img", "aria-label": title }
        : { "aria-hidden": true, focusable: false })}
    >
      {DRAWINGS[name]}
    </svg>
  );
}
