import { cx } from "class-variance-authority";
import type { ComponentProps, ReactNode } from "react";
import { joinIds, shakeClass } from "./field";
import { FieldError } from "./field-error";

export type RadioCardOption = { value: string; label: ReactNode; description?: ReactNode };

/** value/checked van por opción: un value del grupo (Controller) los dejaría todos iguales. */
type RadioCardsProps = Omit<
  ComponentProps<"input">,
  "type" | "id" | "value" | "checked" | "defaultChecked" | "defaultValue"
> & {
  /** Prefijo de los id de cada opción y de la ayuda/error. */
  id: string;
  legend: ReactNode;
  options: RadioCardOption[];
  hint?: ReactNode;
  error?: string;
  /** Opción marcada al inicio. */
  defaultValue?: string;
  /** Columnas desde md (en móvil siempre una). */
  columns?: 1 | 2 | 3;
  /** submitCount: shake al enviar con error (ver Field). */
  shakeKey?: number;
};

const COLUMNS = { 1: "", 2: "md:grid-cols-2", 3: "md:grid-cols-3" } as const;

/**
 * Grupo de opciones con aspecto de tarjeta (BD-022): radios nativos en un fieldset con rol
 * radiogroup (donde aria-invalid es válido), así las flechas mueven la selección y funcionan sin
 * JS. Las props del input (name, onChange, ref de register…) se aplican a cada radio, como pide
 * React Hook Form.
 */
export function RadioCards({
  id,
  legend,
  options,
  hint,
  error,
  defaultValue,
  columns = 2,
  shakeKey = 0,
  className,
  required,
  ...inputProps
}: RadioCardsProps) {
  const hintId = hint ? `${id}-ayuda` : undefined;
  const errorId = `${id}-error`;

  return (
    <fieldset
      role="radiogroup"
      aria-describedby={joinIds(hintId, error ? errorId : undefined)}
      aria-invalid={error ? true : undefined}
      aria-required={required || undefined}
      className={cx("flex flex-col", className)}
    >
      <legend className="mb-2 text-[0.9375rem] font-bold text-ink">
        {legend}
        {required ? (
          <span aria-hidden="true" className="text-danger">
            {" "}
            *
          </span>
        ) : null}
      </legend>
      <div className={cx("grid gap-3", COLUMNS[columns], shakeClass(error, shakeKey))}>
        {options.map((option) => {
          const optionId = `${id}-${option.value}`;
          return (
            <label
              key={option.value}
              htmlFor={optionId}
              className={cx(
                "flex min-h-11 cursor-pointer items-start gap-3 rounded-md border-2 bg-paper p-4 has-checked:border-blue has-checked:bg-blue-50 has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-focus",
                // Un solo color de borde por estado (sin tailwind-merge no se pisan entre sí).
                error ? "border-danger" : "border-line-control",
              )}
            >
              <input
                {...inputProps}
                id={optionId}
                type="radio"
                value={option.value}
                defaultChecked={
                  defaultValue === undefined ? undefined : defaultValue === option.value
                }
                required={required}
                className="mt-1 size-5 shrink-0 accent-blue focus-visible:outline-none"
              />
              <span className="flex flex-col gap-1">
                <span className="font-bold text-ink">{option.label}</span>
                {option.description ? (
                  <span className="text-sm text-muted">{option.description}</span>
                ) : null}
              </span>
            </label>
          );
        })}
      </div>
      {hint ? (
        <p id={hintId} className="mt-2 text-sm text-muted">
          {hint}
        </p>
      ) : null}
      <FieldError id={errorId} error={error} />
    </fieldset>
  );
}
