"use client";

import { openDialog } from "@/components/feedback/feedback-store";
import { HoneypotField } from "@/components/forms/honeypot-field";
import { useRequestForm } from "@/components/forms/use-request-form";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { RadioCards } from "@/components/ui/radio-cards";
import { Select } from "@/components/ui/select";
import { feedback } from "@/content/feedback";
import { monthOptions, schoolForm as t, schoolLevelOptions } from "@/content/forms";
import { track } from "@/features/analytics/track";
import { submitSchoolVisit } from "@/features/schools/actions";
import {
  SCHOOL_FIELD_MAX,
  SCHOOL_FIELDS,
  SCHOOL_MAX_STUDENTS,
  type SchoolField,
} from "@/features/schools/form-fields";

/** id de cada control (el de «nivel» es el prefijo de sus radios). */
const IDS: Record<SchoolField, string> = {
  schoolName: "escuela-colegio",
  level: "escuela-nivel",
  students: "escuela-alumnos",
  department: "escuela-departamento",
  municipality: "escuela-municipio",
  name: "escuela-nombre",
  phone: "escuela-telefono",
  email: "escuela-correo",
  preferredMonth: "escuela-mes",
};

const loadErrors = () => import("@/features/schools/schema").then((m) => m.schoolVisitErrors);

type SchoolVisitFormProps = {
  departments: { slug: string; name: string }[];
  /** Enlace de WhatsApp general; null sin número en los ajustes. */
  whatsappUrl: string | null;
};

/**
 * «Lleva Bolik a tu escuela» (BD-076, docs/06 §3.9, doc 17 §4): colegio, nivel, alumnos,
 * departamento, municipio, nombre, teléfono o correo y mes preferido. Éxito con el diálogo festivo
 * y confeti ligero (A-60). Lo monta la página de escuelas (BD-105).
 */
export function SchoolVisitForm({ departments, whatsappUrl }: SchoolVisitFormProps) {
  const { formProps, errors, submitCount, sending } = useRequestForm({
    fields: SCHOOL_FIELDS,
    loadErrors,
    submit: submitSchoolVisit,
    failed: feedback.forms.failed,
    whatsappUrl,
    onSuccess: ({ folio }, values, { trapped }) => {
      // Conversión (docs/12 §4): sin datos personales, solo nivel y departamento.
      if (!trapped)
        track("school_request_submit", { level: values.level, department: values.department });
      openDialog(feedback.forms.schoolSent(folio, values.schoolName?.trim() ?? ""), {
        kind: "success",
        celebrate: true,
      });
    },
  });

  return (
    <form {...formProps} className="relative flex flex-col gap-6">
      <HoneypotField />
      <fieldset disabled={sending} className="flex min-w-0 flex-col gap-6">
        <Field
          id={IDS.schoolName}
          label={t.schoolName}
          required
          error={errors.schoolName}
          shakeKey={submitCount}
        >
          <Input
            name="schoolName"
            autoComplete="organization"
            maxLength={SCHOOL_FIELD_MAX.schoolName}
          />
        </Field>
        <RadioCards
          id={IDS.level}
          name="level"
          legend={t.level}
          required
          options={[...schoolLevelOptions]}
          error={errors.level}
          shakeKey={submitCount}
        />
        <Field
          id={IDS.students}
          label={`${t.students} ${t.optional}`}
          error={errors.students}
          shakeKey={submitCount}
        >
          <Input
            name="students"
            inputMode="numeric"
            autoComplete="off"
            maxLength={String(SCHOOL_MAX_STUDENTS).length + 1}
          />
        </Field>
        <div className="grid gap-6 md:grid-cols-2">
          <Field
            id={IDS.department}
            label={t.department}
            required
            error={errors.department}
            shakeKey={submitCount}
          >
            <Select name="department" placeholder={t.departmentPlaceholder} defaultValue="">
              {departments.map((department) => (
                <option key={department.slug} value={department.slug}>
                  {department.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            id={IDS.municipality}
            label={t.municipality}
            required
            error={errors.municipality}
            shakeKey={submitCount}
          >
            <Input
              name="municipality"
              autoComplete="address-level2"
              maxLength={SCHOOL_FIELD_MAX.municipality}
            />
          </Field>
        </div>
        <Field id={IDS.name} label={t.name} required error={errors.name} shakeKey={submitCount}>
          <Input name="name" autoComplete="name" maxLength={SCHOOL_FIELD_MAX.name} />
        </Field>
        <div className="grid gap-6 md:grid-cols-2">
          <Field
            id={IDS.phone}
            label={t.phone}
            hint={t.phoneOrEmailHint}
            error={errors.phone}
            shakeKey={submitCount}
          >
            <PhoneInput name="phone" />
          </Field>
          <Field id={IDS.email} label={t.email} error={errors.email} shakeKey={submitCount}>
            <Input
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              maxLength={160}
              aria-describedby={`${IDS.phone}-ayuda`}
            />
          </Field>
        </div>
        <Field
          id={IDS.preferredMonth}
          label={`${t.preferredMonth} ${t.optional}`}
          error={errors.preferredMonth}
          shakeKey={submitCount}
        >
          <Select name="preferredMonth" placeholder={t.monthPlaceholder} defaultValue="">
            {monthOptions.map((month) => (
              <option key={month.value} value={month.value}>
                {month.label}
              </option>
            ))}
          </Select>
        </Field>
      </fieldset>
      <Button type="submit" block size="lg" loading={sending} loadingText={t.sending}>
        {t.submit}
      </Button>
    </form>
  );
}
