import { cx } from "class-variance-authority";

type SpinnerProps = { className?: string };

/**
 * Spinner de 16 px (BD-021). Es decorativo: el estado de carga se anuncia con texto aparte. Gira con
 * transform (.spin de motion.css) y se queda quieto con movimiento reducido.
 */
export function Spinner({ className }: SpinnerProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      width="16"
      height="16"
      fill="none"
      aria-hidden="true"
      focusable="false"
      // size-4!: los botones dan 20 px a sus íconos con [&_svg]:size-5; el spinner siempre mide 16.
      className={cx("spin size-4! shrink-0", className)}
    >
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeOpacity="0.3" strokeWidth="2" />
      <path
        d="M14.5 8A6.5 6.5 0 0 0 8 1.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
