import { cx } from "class-variance-authority";
import type { ComponentProps, ReactNode } from "react";
import { joinIds, shakeClass } from "./field";
import { FieldError } from "./field-error";

type CheckboxProps = Omit<ComponentProps<"input">, "type"> & {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  /** submitCount: shake al enviar con error (ver Field). */
  shakeKey?: number;
};

/**
 * Casilla con su etiqueta (BD-022). Toda la fila es clickeable y mide al menos 44 px de alto.
 * Lleva su propia ayuda y error (no va dentro de Field). Acepta ref (register).
 */
export function Checkbox({
  id,
  label,
  hint,
  error,
  shakeKey = 0,
  className,
  ...props
}: CheckboxProps) {
  const hintId = hint ? `${id}-ayuda` : undefined;
  const errorId = `${id}-error`;

  return (
    <div className={cx("flex flex-col", className)}>
      <label
        htmlFor={id}
        className={cx(
          "flex min-h-11 cursor-pointer items-center gap-3 text-ink",
          shakeClass(error, shakeKey),
        )}
      >
        <input
          id={id}
          type="checkbox"
          aria-describedby={joinIds(hintId, error ? errorId : undefined)}
          aria-invalid={error ? true : undefined}
          className="size-5 shrink-0 cursor-pointer accent-blue"
          {...props}
        />
        <span>{label}</span>
      </label>
      {hint ? (
        <p id={hintId} className="pl-8 text-sm text-muted">
          {hint}
        </p>
      ) : null}
      <FieldError id={errorId} error={error} className="pl-8" />
    </div>
  );
}
