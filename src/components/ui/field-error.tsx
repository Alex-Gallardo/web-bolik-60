import { cx } from "class-variance-authority";

type FieldErrorProps = {
  /** id que el control usa en aria-describedby. */
  id: string;
  error?: string;
  className?: string;
};

/**
 * Mensaje de error de un campo (docs/08 §2, BD-022): ícono y texto en --danger. La región aria-live
 * existe siempre y sin display:none (vacía mide 0 y no lleva margen): fuera del árbol de
 * accesibilidad los lectores no anunciarían el error al aparecer.
 */
export function FieldError({ id, error, className }: FieldErrorProps) {
  return (
    <p id={id} aria-live="polite" className={cx("text-sm text-danger", error && "mt-2", className)}>
      {error ? (
        <span className="flex items-start gap-1.5">
          <svg
            viewBox="0 0 16 16"
            aria-hidden="true"
            focusable="false"
            className="mt-0.5 size-4 shrink-0"
          >
            <path
              d="M8 1.5 15 14H1z M8 6v3.5 M8 11.5v.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {error}
        </span>
      ) : null}
    </p>
  );
}
