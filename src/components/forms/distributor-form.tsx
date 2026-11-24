"use client";

import { openDialog } from "@/components/feedback/feedback-store";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { RadioCards } from "@/components/ui/radio-cards";
import { Select } from "@/components/ui/select";
import { feedback } from "@/content/feedback";
import { businessTypeOptions, distributorForm as t } from "@/content/forms";
import { track } from "@/features/analytics/track";
import { submitDistributor } from "@/features/distributors/actions";
import {
  DISTRIBUTOR_FIELD_MAX,
  DISTRIBUTOR_FIELDS,
  type DistributorField,
} from "@/features/distributors/form-fields";
import { HoneypotField } from "./honeypot-field";
import { useRequestForm } from "./use-request-form";

/** id de cada control (el de «tipo» es el prefijo de sus radios). */
const IDS: Record<DistributorField, string> = {
  businessName: "distribuidor-negocio",
  businessType: "distribuidor-tipo",
  nit: "distribuidor-nit",
  department: "distribuidor-departamento",
  municipality: "distribuidor-municipio",
  name: "distribuidor-nombre",
  phone: "distribuidor-telefono",
  email: "distribuidor-correo",
};

const loadErrors = () => import("@/features/distributors/schema").then((m) => m.distributorErrors);

type DistributorFormProps = {
  departments: { slug: string; name: string }[];
  /** Enlace de WhatsApp general; null sin número en los ajustes. */
  whatsappUrl: string | null;
};

/**
 * «Quiero ser distribuidor» (BD-076, docs/06 §3.10, doc 17 §4): negocio, tipo, NIT (opcional),
 * departamento, municipio, nombre y teléfono o correo. Lo monta la página de mayoreo (BD-106).
 */
export function DistributorForm({ departments, whatsappUrl }: DistributorFormProps) {
  const { formProps, errors, submitCount, sending } = useRequestForm({
    fields: DISTRIBUTOR_FIELDS,
    loadErrors,
    submit: submitDistributor,
    failed: feedback.forms.failed,
    whatsappUrl,
    onSuccess: ({ folio }, values, { trapped }) => {
      // Conversión (docs/12 §4): sin datos personales, solo tipo y departamento.
      if (!trapped)
        track("distributor_submit", {
          business_type: values.businessType,
          department: values.department,
        });
      openDialog(feedback.forms.distributorSent(folio), { kind: "success" });
    },
  });

  return (
    <form {...formProps} className="relative flex flex-col gap-6">
      <HoneypotField />
      <fieldset disabled={sending} className="flex min-w-0 flex-col gap-6">
        <Field
          id={IDS.businessName}
          label={t.businessName}
          required
          error={errors.businessName}
          shakeKey={submitCount}
        >
          <Input
            name="businessName"
            autoComplete="organization"
            maxLength={DISTRIBUTOR_FIELD_MAX.businessName}
          />
        </Field>
        <RadioCards
          id={IDS.businessType}
          name="businessType"
          legend={t.businessType}
          required
          options={[...businessTypeOptions]}
          error={errors.businessType}
          shakeKey={submitCount}
        />
        <Field
          id={IDS.nit}
          label={`${t.nit} ${t.optional}`}
          error={errors.nit}
          shakeKey={submitCount}
        >
          <Input name="nit" autoComplete="off" maxLength={DISTRIBUTOR_FIELD_MAX.nit} />
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
              maxLength={DISTRIBUTOR_FIELD_MAX.municipality}
            />
          </Field>
        </div>
        <Field id={IDS.name} label={t.name} required error={errors.name} shakeKey={submitCount}>
          <Input name="name" autoComplete="name" maxLength={DISTRIBUTOR_FIELD_MAX.name} />
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
      </fieldset>
      <Button type="submit" block size="lg" loading={sending} loadingText={t.sending}>
        {t.submit}
      </Button>
    </form>
  );
}
