"use client";

import { useState } from "react";
import { Field } from "@/components/ui/field";
import { QuantityStepper } from "@/components/ui/quantity-stepper";

/** Stepper de cantidad (BD-022) con su etiqueta: − / número / +, mínimo 1. */
export function StepperDemo() {
  const [value, setValue] = useState(2);
  return (
    <Field id="demo-stepper" label="Cajillas" className="max-w-xs">
      <QuantityStepper value={value} onChange={setValue} />
    </Field>
  );
}
