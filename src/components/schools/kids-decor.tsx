import { cx } from "class-variance-authority";
import type { CSSProperties } from "react";

/** El trazo del garabato (A-41): el mismo en la home y en /escuelas. */
const SCRIBBLE = "M3 14c20-10 34 8 54-2s34-8 52 2 38 8 58-2 34-6 50 2";

type KidsScribbleProps = {
  /**
   * reveal: se dibuja al entrar en pantalla (envoltorio data-reveal, .scribble; secciones lejos del
   * inicio, como la de la home). load: al cargar (.ink-draw, A-11), para un hero que ya está a la
   * vista y que el revelado nunca oculta.
   */
  draw: "reveal" | "load";
  className?: string;
};

/**
 * Garabato coral bajo un título infantil (A-41, docs/09; BD-053, BD-105). Decorativo. Dura
 * --dur-slower (700 ms), el token más cercano a los 1.2 s de docs/09.
 */
export function KidsScribble({ draw, className }: KidsScribbleProps) {
  const svg = (
    <svg
      viewBox="0 0 220 24"
      aria-hidden="true"
      focusable="false"
      className={cx(draw === "reveal" && "scribble", className)}
    >
      <path
        d={SCRIBBLE}
        pathLength={1}
        strokeWidth={4}
        strokeLinecap="round"
        className={cx("fill-none stroke-coral", draw === "load" && "ink-draw ink-draw-late")}
        style={draw === "load" ? ({ "--path-length": 1 } as CSSProperties) : undefined}
      />
    </svg>
  );
  return draw === "reveal" ? (
    <span data-reveal className="-mt-3 block">
      {svg}
    </span>
  ) : (
    svg
  );
}

/** Figuras del hero de /escuelas: posición, tamaño y color de cada una. */
const FIGURES = [
  { className: "top-8 right-[6%] size-10 text-coral", shape: "circle" },
  { className: "top-1/3 right-[18%] size-8 text-kblue", shape: "star" },
  { className: "bottom-10 right-[8%] size-12 text-kgreen", shape: "triangle" },
  { className: "bottom-6 right-[24%] size-6 text-coral", shape: "star" },
] as const;

const SHAPES = {
  circle: <circle cx="12" cy="12" r="10" />,
  triangle: <path d="M12 2 22 21H2Z" />,
  star: <path d="m12 2 3 7 7 .6-5.4 4.6 1.7 7.3L12 17.6 5.7 21.5l1.7-7.3L2 9.6 9 9Z" />,
};

/**
 * Figuras que flotan en el hero de /escuelas (A-41, .kids-float: transform, --dur-float; quietas
 * con movimiento reducido). Decorativas. Solo desde lg, a la derecha del texto (max-w-2xl): en
 * pantallas más chicas quedarían detrás de él.
 */
export function KidsFigures() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 hidden lg:block">
      {FIGURES.map((figure, index) => (
        <svg
          key={index}
          viewBox="0 0 24 24"
          focusable="false"
          className={`kids-float absolute fill-current ${figure.className}`}
          style={{ "--i": index } as CSSProperties}
        >
          {SHAPES[figure.shape]}
        </svg>
      ))}
    </div>
  );
}
