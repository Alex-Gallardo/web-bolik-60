"use client";

import { openDialog } from "@/components/feedback/feedback-store";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { feedback } from "@/content/feedback";
import { contactForm as t, contactSubjectOptions } from "@/content/forms";
import { track } from "@/features/analytics/track";
import { submitContact } from "@/features/contact/actions";
import {
  CONTACT_FIELD_MAX,
  CONTACT_FIELDS,
  type ContactField,
} from "@/features/contact/form-fields";
import { HoneypotField } from "./honeypot-field";
import { useRequestForm } from "./use-request-form";

const IDS: Record<ContactField, string> = {
  subject: "contacto-asunto",
  name: "contacto-nombre",
  phone: "contacto-telefono",
  email: "contacto-correo",
  message: "contacto-mensaje",
};

const loadErrors = () => import("@/features/contact/schema").then((m) => m.contactErrors);

type ContactFormProps = {
  /** Enlace de WhatsApp general; null sin número en los ajustes. */
  whatsappUrl: string | null;
};

/**
 * Formulario de contacto (BD-076, docs/06 §3.15, doc 17 §4): asunto, nombre, teléfono o correo y
 * mensaje. Lo monta la página de contacto (BD-111).
 */
export function ContactForm({ whatsappUrl }: ContactFormProps) {
  const { formProps, errors, submitCount, sending } = useRequestForm({
    fields: CONTACT_FIELDS,
    loadErrors,
    submit: submitContact,
    failed: feedback.forms.contactFailed,
    whatsappUrl,
    onSuccess: (_data, values, { trapped }) => {
      if (!trapped) track("contact_submit", { subject: values.subject });
      openDialog(feedback.forms.contactSent, { kind: "success" });
    },
  });

  return (
    <form {...formProps} className="relative flex flex-col gap-6">
      <HoneypotField />
      <fieldset disabled={sending} className="flex min-w-0 flex-col gap-6">
        <Field
          id={IDS.subject}
          label={t.subject}
          required
          error={errors.subject}
          shakeKey={submitCount}
        >
          <Select name="subject" placeholder={t.subjectPlaceholder} defaultValue="">
            {contactSubjectOptions.map((subject) => (
              <option key={subject.value} value={subject.value}>
                {subject.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field id={IDS.name} label={t.name} required error={errors.name} shakeKey={submitCount}>
          <Input name="name" autoComplete="name" maxLength={CONTACT_FIELD_MAX.name} />
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
          id={IDS.message}
          label={t.message}
          required
          error={errors.message}
          shakeKey={submitCount}
        >
          <Textarea name="message" maxLength={CONTACT_FIELD_MAX.message} />
        </Field>
      </fieldset>
      <Button type="submit" block size="lg" loading={sending} loadingText={t.sending}>
        {t.submit}
      </Button>
    </form>
  );
}
