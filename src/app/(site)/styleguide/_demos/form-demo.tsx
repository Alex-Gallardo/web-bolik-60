"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { QuantityStepper } from "@/components/ui/quantity-stepper";
import { RadioCards } from "@/components/ui/radio-cards";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { feedback } from "@/content/feedback";
import { CUSTOMER_TYPES } from "@/lib/constants";
import {
  optionalEmail,
  optionalGtPhone,
  optionalText,
  quantity,
  requiredText,
  withPhoneOrEmail,
} from "@/lib/form-schemas";

/** Opciones de tipo de cliente de /cotizacion (doc 17 §4); los valores son de CUSTOMER_TYPES. */
const CUSTOMER_OPTIONS: { value: (typeof CUSTOMER_TYPES)[number]; label: string }[] = [
  { value: "libreria", label: "Librería o tienda" },
  { value: "empresa", label: "Empresa" },
  { value: "colegio", label: "Colegio o universidad" },
  { value: "otro", label: "Otro" },
];

const NAME_MAX = 120;
const NOTES_MAX = 2000;

const schema = withPhoneOrEmail(
  z.object({
    customerType: z.enum(CUSTOMER_TYPES, { error: feedback.forms.errors.required }),
    name: requiredText(NAME_MAX),
    phone: optionalGtPhone,
    email: optionalEmail,
    department: requiredText(40),
    quantity,
    notes: optionalText(NOTES_MAX),
    remember: z.boolean(),
  }),
);

type FormInput = z.input<typeof schema>;
type FormOutput = z.output<typeof schema>;

type FormDemoProps = { departments: { slug: string; name: string }[] };

/**
 * Formulario de ejemplo de la vitrina (BD-022): todos los controles con React Hook Form y Zod.
 * Valida al salir de cada campo y al enviar; al enviar con errores, el foco va al primero. Un
 * formulario real envía a su Server Action (action={…}); aquí method="post" evita que sin JS los
 * datos viajen en la URL.
 */
export function FormDemo({ departments }: FormDemoProps) {
  const [sent, setSent] = useState(false);
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, submitCount, isSubmitting },
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(schema),
    mode: "onBlur",
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      department: "",
      quantity: 1,
      notes: "",
      remember: false,
    },
  });

  const onSubmit = handleSubmit(async () => setSent(true));

  return (
    <form
      data-testid="formulario-ejemplo"
      method="post"
      noValidate
      onSubmit={onSubmit}
      className="flex max-w-2xl flex-col gap-6"
    >
      <RadioCards
        id="tipo"
        legend="Tipo de cliente"
        required
        options={CUSTOMER_OPTIONS}
        error={errors.customerType?.message}
        shakeKey={submitCount}
        {...register("customerType")}
      />
      <Field
        id="nombre"
        label="Tu nombre"
        required
        error={errors.name?.message}
        shakeKey={submitCount}
      >
        <Input autoComplete="name" maxLength={NAME_MAX} {...register("name")} />
      </Field>
      <div className="grid gap-6 md:grid-cols-2">
        {/* deps después del primer envío: el aviso «al menos uno» se borra de los dos campos al
            corregir cualquiera, sin marcar antes de tiempo un campo que aún no se visita. */}
        <Field id="telefono" label="Teléfono" error={errors.phone?.message} shakeKey={submitCount}>
          <PhoneInput {...register("phone", { deps: submitCount > 0 ? ["email"] : [] })} />
        </Field>
        <Field id="correo" label="Correo" error={errors.email?.message} shakeKey={submitCount}>
          <Input
            type="email"
            autoComplete="email"
            inputMode="email"
            maxLength={160}
            {...register("email", { deps: submitCount > 0 ? ["phone"] : [] })}
          />
        </Field>
      </div>
      <Field
        id="departamento"
        label="Departamento"
        required
        error={errors.department?.message}
        shakeKey={submitCount}
      >
        <Select placeholder="Elige tu departamento" {...register("department")}>
          {departments.map((department) => (
            <option key={department.slug} value={department.slug}>
              {department.name}
            </option>
          ))}
        </Select>
      </Field>
      <Controller
        control={control}
        name="quantity"
        render={({ field }) => (
          // Field va dentro del render: su hijo directo debe ser el control, no el Controller.
          <Field
            id="cantidad"
            label="Cantidad de cajillas"
            error={errors.quantity?.message}
            shakeKey={submitCount}
          >
            <QuantityStepper
              ref={field.ref}
              name={field.name}
              value={Number(field.value)}
              onChange={field.onChange}
              onBlur={field.onBlur}
            />
          </Field>
        )}
      />
      <Field
        id="notas"
        label="Notas"
        hint="¿Algo que debamos saber? Fechas, colores, entregas…"
        error={errors.notes?.message}
      >
        <Textarea maxLength={NOTES_MAX} {...register("notes")} />
      </Field>
      <Checkbox
        id="recordar"
        label="Recordar mis datos en este dispositivo"
        {...register("remember")}
      />
      <div>
        <Button type="submit" block size="lg" loading={isSubmitting}>
          Enviar cotización
        </Button>
      </div>
      <p role="status" className="text-sm font-bold text-green">
        {sent ? "Formulario válido (demostración: no se envía nada)." : ""}
      </p>
    </form>
  );
}
