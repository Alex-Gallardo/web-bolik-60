import type { ColorView } from "@/server/data/types";

/**
 * Ilustración del Bolik Ultra mientras no hay foto (BD-052): un bolígrafo por color, con el
 * cuerpo claro, la franja y la tapa del color de la tinta (el hex sale de los datos de la
 * variante, no del código). Decorativa: el texto de la sección dice lo mismo.
 */
export function UltraIllustration({ colors }: { colors: ColorView[] }) {
  const shown = colors.slice(0, 3);
  return (
    <svg
      viewBox="0 0 340 240"
      aria-hidden="true"
      focusable="false"
      className="h-auto w-full"
      data-illustration="ultra"
    >
      {shown.map((color, index) => (
        <g key={color.key} transform={`translate(20 ${50 + index * 60}) rotate(-12 150 20)`}>
          {/* Cuerpo hexagonal: dos caras visibles. */}
          <path
            d="M40 6h196l12 14-12 14H40z"
            className="fill-paper stroke-line-strong"
            strokeWidth="2"
          />
          <path d="M40 20h208" className="stroke-line" strokeWidth="2" />
          {/* Franja de tinta a lo largo del cuerpo. */}
          <rect x="64" y="16" width="150" height="8" rx="4" style={{ fill: color.hex }} />
          {/* Punta. */}
          <path d="M248 20l-12-14v28z" className="fill-soft stroke-line-strong" strokeWidth="2" />
          <path d="M248 14l20 6-20 6z" className="fill-muted" />
          {/* Tapa del color. */}
          <rect x="0" y="2" width="48" height="36" rx="8" style={{ fill: color.hex }} />
          <rect x="10" y="-4" width="34" height="8" rx="4" style={{ fill: color.hex }} />
        </g>
      ))}
    </svg>
  );
}
