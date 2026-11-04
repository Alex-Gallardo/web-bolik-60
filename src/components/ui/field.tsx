import { cx } from "class-variance-authority";
import { cloneElement, type ReactElement, type ReactNode } from "react";
import { FieldError } from "./field-error";

type ControlProps = {
  id?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
  required?: boolean;
};

type FieldProps = {
  /** id del control: une la etiqueta, la ayuda y el error. */
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  /** Mensaje de error (de feedback.forms.errors vía Zod). */
  error?: string;
  required?: boolean;
  /**
   * Contador de envíos con error (submitCount de React Hook Form): cada vez que cambia y hay error,
   * el campo hace el shake sutil (A-04) sin volver a montarse. Sin él no hay animación. Después
   * del primer envío, un error que aparece al revalidar también hace el shake (Field no guarda
   * estado para servir en Server Components).
   */
  shakeKey?: number;
  className?: string;
  /**
   * Un solo control (Input, Textarea, Select, QuantityStepper…): recibe id y los aria-*. Con un
   * Controller de React Hook Form, Field va dentro de su render (su hijo debe ser el control).
   */
  children: ReactElement<ControlProps>;
};

/** "a b" + "c" → "a b c" (sin vacíos ni repetidos). */
export function joinIds(...ids: (string | undefined)[]): string | undefined {
  const unique = [...new Set(ids.flatMap((id) => id?.split(" ") ?? []).filter(Boolean))];
  return unique.length ? unique.join(" ") : undefined;
}

/** Clase del shake: alterna entre dos animaciones iguales para que cada envío la reinicie. */
export function shakeClass(error: string | undefined, shakeKey: number): string | undefined {
  return error && shakeKey > 0 ? (shakeKey % 2 ? "shake" : "shake-again") : undefined;
}

/**
 * Patrón único de campo (docs/08 §2, BD-022): etiqueta siempre visible, control, ayuda y error.
 * Une aria-describedby (sin pisar el que ya traiga el control) y marca aria-invalid. El error vive
 * en una región aria-live que existe siempre, así los lectores lo anuncian al aparecer.
 */
export function Field({
  id,
  label,
  hint,
  error,
  required,
  shakeKey = 0,
  className,
  children,
}: FieldProps) {
  const hintId = hint ? `${id}-ayuda` : undefined;
  const errorId = `${id}-error`;

  return (
    <div className={cx("flex flex-col", className)}>
      <label htmlFor={id} className="mb-2 text-[0.9375rem] font-bold text-ink">
        {label}
        {required ? (
          <span aria-hidden="true" className="text-danger">
            {" "}
            *
          </span>
        ) : null}
      </label>
      <div className={shakeClass(error, shakeKey)}>
        {cloneElement(children, {
          id,
          "aria-describedby": joinIds(
            children.props["aria-describedby"],
            hintId,
            error ? errorId : undefined,
          ),
          "aria-invalid": error ? true : undefined,
          required: required || children.props.required || undefined,
        })}
      </div>
      {hint ? (
        <p id={hintId} className="mt-2 text-sm text-muted">
          {hint}
        </p>
      ) : null}
      <FieldError id={errorId} error={error} />
    </div>
  );
}
