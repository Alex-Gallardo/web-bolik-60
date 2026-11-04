"use client";

import { cx } from "class-variance-authority";
import { useState, type KeyboardEvent, type Ref } from "react";
import { ui } from "@/content/ui";
import { QUOTE_LIMITS } from "@/lib/constants";
import { controlClasses, singleLineClasses } from "./control-styles";

type QuantityStepperProps = {
  value: number;
  onChange: (value: number) => void;
  onBlur?: () => void;
  /** field.ref del Controller: el foco puede ir aquí si la cantidad es el primer error. */
  ref?: Ref<HTMLInputElement>;
  min?: number;
  max?: number;
  /** Para enviar con el formulario sin JS (el input lleva este name). */
  name?: string;
  id?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
  required?: boolean;
  disabled?: boolean;
  className?: string;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/**
 * Cantidad con − / número / + (BD-022). Controlado: con React Hook Form va dentro de un Controller.
 * Los botones y las flechas se quedan entre min y max (1 a 9,999, QUOTE_LIMITS). Lo que se escribe
 * no se recorta: si pasa del máximo, el esquema (quantity) muestra «Para más de 9,999,
 * escríbenos por WhatsApp». Inicio y Fin van al mínimo y al máximo. Úsalo dentro de Field.
 * Con React Hook Form, la cantidad necesita un defaultValue numérico (por ejemplo 1).
 */
export function QuantityStepper({
  value: rawValue,
  onChange,
  onBlur,
  ref,
  min = QUOTE_LIMITS.minQty,
  max = QUOTE_LIMITS.maxQty,
  name,
  id,
  disabled,
  className,
  ...aria
}: QuantityStepperProps) {
  // Un valor que no es número (formulario sin defaultValues, reset) cuenta como el mínimo.
  const value = Number.isFinite(rawValue) ? rawValue : min;
  // Lo que se está escribiendo puede quedar vacío un momento: se corrige al salir del campo.
  const [draft, setDraft] = useState(String(value));
  // Si el valor cambia desde afuera (botones, reset del formulario), el texto lo sigue.
  const [synced, setSynced] = useState(value);
  if (!Object.is(value, synced)) {
    setSynced(value);
    setDraft(String(value));
  }

  function step(next: number) {
    const fixed = clamp(next, min, max);
    setDraft(String(fixed));
    if (fixed !== value) onChange(fixed);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    const moves: Record<string, number> = {
      ArrowUp: value + 1,
      ArrowDown: value - 1,
      Home: min,
      End: max,
    };
    if (event.key in moves) {
      event.preventDefault();
      step(moves[event.key]!);
    }
  }

  // aria-valuenow solo con un número dentro del rango; si no, se anuncia lo escrito.
  const inRange = draft !== "" && value >= min && value <= max;
  // aria-disabled y no disabled: un botón que se deshabilita con el foco lo manda a <body>.
  const atMin = value <= min;
  const atMax = value >= max;
  const buttonClasses =
    "press flex size-13 shrink-0 items-center justify-center rounded-md border-2 border-line-control bg-paper text-xl font-bold text-ink hover:bg-soft disabled:cursor-not-allowed disabled:opacity-40 aria-disabled:cursor-not-allowed aria-disabled:opacity-40 aria-disabled:active:scale-100";

  return (
    <div className={cx("flex items-center gap-2", className)}>
      <button
        type="button"
        aria-label={ui.quantity.decrease}
        aria-controls={id}
        aria-disabled={atMin || undefined}
        className={buttonClasses}
        disabled={disabled}
        onClick={() => !atMin && step(value - 1)}
      >
        <span aria-hidden="true">−</span>
      </button>
      <input
        ref={ref}
        id={id}
        name={name}
        role="spinbutton"
        inputMode="numeric"
        autoComplete="off"
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={inRange ? value : undefined}
        aria-valuetext={inRange ? undefined : draft}
        // Una cifra más que el máximo: deja escribir 10000 para que salga el aviso de WhatsApp.
        maxLength={String(max).length + 1}
        disabled={disabled}
        value={draft}
        onChange={(event) => {
          const text = event.target.value.replace(/\D/g, "");
          setDraft(text);
          if (text !== "") onChange(Number(text));
        }}
        onBlur={() => {
          // Vacío vuelve al mínimo; "0003" se muestra como 3.
          if (draft === "") step(min);
          else setDraft(String(value));
          onBlur?.();
        }}
        onKeyDown={handleKeyDown}
        className={cx(controlClasses, singleLineClasses, "w-24 text-center tnum")}
        {...aria}
      />
      <button
        type="button"
        aria-label={ui.quantity.increase}
        aria-controls={id}
        aria-disabled={atMax || undefined}
        className={buttonClasses}
        disabled={disabled}
        onClick={() => !atMax && step(value + 1)}
      >
        <span aria-hidden="true">+</span>
      </button>
    </div>
  );
}
