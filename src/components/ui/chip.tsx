import { cva, cx, type VariantProps } from "class-variance-authority";
import type { ComponentProps, ReactNode } from "react";

/**
 * Etiqueta redonda (docs/08 §2, BD-023) con variantes por línea de producto (docs/02: escritura
 * azul, escolar amarillo, arte rojo, oficina verde): fondo claro, texto oscuro y un punto con el
 * color de la línea. Sin tailwind-merge (ver button.tsx).
 */
export const chipVariants = cva(
  // max-w-full + texto truncado: un nombre largo no se sale de una tarjeta angosta (360 px).
  "inline-flex max-w-full items-center gap-2 rounded-full border-2 font-bold whitespace-nowrap",
  {
    variants: {
      line: {
        neutral: "bg-soft text-ink",
        escritura: "bg-blue-50 text-blue-700",
        escolar: "bg-yellow-50 text-ink",
        arte: "bg-red-50 text-red-700",
        oficina: "bg-green-50 text-green",
      },
      size: {
        // Estática, dentro de una tarjeta.
        sm: "px-2.5 py-0.5 text-xs",
        // Seleccionable: objetivo táctil de 44 px.
        md: "min-h-11 px-4 text-sm",
      },
    },
    defaultVariants: { line: "neutral", size: "sm" },
  },
);

/** Color del punto de cada línea. */
const DOT = {
  neutral: "bg-muted",
  escritura: "bg-line-escritura",
  escolar: "bg-line-escolar",
  arte: "bg-line-arte",
  oficina: "bg-line-oficina",
} as const;

type ChipVariant = VariantProps<typeof chipVariants>;

function Dot({ line }: { line: ChipVariant["line"] }) {
  return (
    <span
      aria-hidden="true"
      className={cx("size-2 shrink-0 rounded-full", DOT[line ?? "neutral"])}
    />
  );
}

type ChipProps = ChipVariant & { children: ReactNode; className?: string };

/** Etiqueta estática (no interactiva). */
export function Chip({ line, size, className, children }: ChipProps) {
  return (
    <span className={chipVariants({ line, size, className: cx("border-transparent", className) })}>
      {line && line !== "neutral" ? <Dot line={line} /> : null}
      <span className="truncate">{children}</span>
    </span>
  );
}

type ChipToggleProps = Omit<ComponentProps<"button">, "type"> &
  ChipVariant & {
    /** Seleccionada (filtro activo): se anuncia con aria-pressed. */
    pressed: boolean;
  };

/**
 * Etiqueta seleccionable para filtros (BD-023): un <button> con aria-pressed. El estado lo maneja
 * quien la usa (sin "use client" aquí). Seleccionada: borde de tinta y marca ✓ además del color.
 */
export function ChipToggle({ line, pressed, className, children, ...props }: ChipToggleProps) {
  return (
    <button
      {...props}
      type="button"
      aria-pressed={pressed}
      className={chipVariants({
        line,
        size: "md",
        className: cx(
          "press cursor-pointer",
          pressed ? "border-ink" : "border-transparent hover:border-line-control",
          className,
        ),
      })}
    >
      {pressed ? (
        <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false" className="size-4 shrink-0">
          <path
            d="m3.5 8.5 3 3 6-7"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : line && line !== "neutral" ? (
        <Dot line={line} />
      ) : null}
      <span className="truncate">{children}</span>
    </button>
  );
}
