"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  closeDialog,
  openDialog,
  retryableImport,
  showToast,
} from "@/components/feedback/feedback-store";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { RadioCards } from "@/components/ui/radio-cards";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { feedback } from "@/content/feedback";
import { quotePage } from "@/content/quote";
import { submitQuote } from "@/features/quote/actions";
import { clearDraft, readDraft, saveDraft, type QuoteDraft } from "@/features/quote/draft";
import type { QuoteLine } from "@/features/quote/lines";
import {
  QUOTE_CONTACT_FIELDS,
  QUOTE_FIELD_MAX,
  QUOTE_FORM_CUSTOMER_TYPES,
  organizationRequired,
  type QuoteContactField,
} from "@/features/quote/form-fields";
import { useQuote } from "@/features/quote/store";

const t = quotePage.form;

/** id de cada control (el de «tipo» es el prefijo de sus radios). */
const IDS: Record<QuoteContactField, string> = {
  customerType: "cotizacion-tipo",
  organization: "cotizacion-institucion",
  name: "cotizacion-nombre",
  phone: "cotizacion-telefono",
  email: "cotizacion-correo",
  department: "cotizacion-departamento",
  municipality: "cotizacion-municipio",
  notes: "cotizacion-notas",
};

type Errors = Partial<Record<QuoteContactField, string>>;

/**
 * El esquema (`zod/mini`, ~25 KB gzip con Turbopack) llega al primer uso del formulario, no al
 * cargar la página: no cuenta en su JS inicial (docs/12 §2). Se precarga al entrar al formulario.
 */
const loadSchema = retryableImport(() => import("@/features/quote/schema"));

/** Errores por campo; null si el esquema no se pudo descargar (sin red: valida el servidor). */
async function validate(values: QuoteDraft): Promise<Errors | null> {
  try {
    return (await loadSchema()).contactErrors(values);
  } catch {
    return null;
  }
}

type QuoteFormProps = {
  departments: { slug: string; name: string }[];
  lines: QuoteLine[];
  /** Enlace de WhatsApp con la cotización sin enviar; null sin número en los ajustes. */
  whatsappUrl: string | null;
};

/** Lo escrito en el formulario, como textos (FormData). */
function readValues(form: HTMLFormElement): QuoteDraft {
  const data = new FormData(form);
  const values: QuoteDraft = {};
  for (const field of QUOTE_CONTACT_FIELDS) {
    const value = data.get(field);
    if (typeof value === "string") values[field] = value;
  }
  return values;
}

/**
 * Formulario de /cotizacion (BD-072, docs/06 §3.16): ≤ 6 obligatorios (tipo, institución salvo
 * «Otro», nombre, teléfono o correo, departamento). Valida con el esquema de features/quote/schema
 * (`zod/mini`, el mismo de la Server Action) al salir de cada campo y al enviar; sin React Hook
 * Form, que con Zod no cabe en el presupuesto de la página (docs/12 §2). Con errores, foco en el
 * primero y toast `forms.invalid` (docs/08 §4). El esquema se descarga al entrar al formulario. Lo escrito se guarda como borrador en
 * sessionStorage; `?tipo=libreria|empresa` (los CTA del hero) elige el tipo, también sobre el
 * borrador. Mientras se envía, los campos quedan bloqueados.
 */
export function QuoteForm({ departments, lines, whatsappUrl }: QuoteFormProps) {
  const router = useRouter();
  const form = useRef<HTMLFormElement>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [submitCount, setSubmitCount] = useState(0);
  const [customerType, setCustomerType] = useState<string>("");
  const [sending, setSending] = useState(false);
  /** Campos que la persona ya visitó: solo esos muestran su error antes del primer envío. */
  const touched = useRef(new Set<QuoteContactField>());
  /**
   * Ya se intentó enviar. Ref y no el submitCount del render: al enviar, mover el foco al primer
   * error dispara el blur del campo que lo tenía (Enter desde un campo) en el mismo render, y ese
   * blur no debe esconder el aviso «al menos un teléfono o un correo».
   */
  const submitted = useRef(false);
  const checking = useRef(false);

  // Borrador y ?tipo= al montar (los campos no son controlados: se llenan aquí).
  useEffect(() => {
    const el = form.current;
    if (!el) return;
    const draft = readDraft();
    // ?tipo= es lo que la persona acaba de elegir (un CTA del hero): gana sobre el borrador.
    const wanted = new URLSearchParams(window.location.search).get("tipo");
    if (QUOTE_FORM_CUSTOMER_TYPES.some((type) => type === wanted)) draft.customerType = wanted!;
    // Un departamento guardado que ya no está en la lista dejaría el select en blanco.
    if (draft.department && !departments.some((d) => d.slug === draft.department))
      delete draft.department;
    for (const field of QUOTE_CONTACT_FIELDS) {
      const value = draft[field];
      if (!value) continue;
      if (field === "customerType") {
        // Sin armar un selector con el valor guardado (un borrador alterado lo rompería).
        const radios = el.elements.namedItem("customerType");
        if (radios instanceof RadioNodeList) radios.value = value;
      } else {
        const control = el.elements.namedItem(field);
        if (control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement)
          control.value = value;
        else if (control instanceof HTMLSelectElement) control.value = value;
      }
    }
    // Estado leído de lo que ya está en el DOM (borrador o ?tipo=), una sola vez al montar.
    setCustomerType(readValues(el).customerType ?? "");
    // Solo al montar: los departamentos llegan del servidor y no cambian en la página.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Errores visibles: los de campos visitados (o todos después de enviar). */
  const visibleErrors = (all: Errors, submitted: boolean): Errors => {
    if (submitted) return all;
    const shown: Errors = {};
    for (const field of touched.current) {
      // «Al menos un teléfono o un correo» solo después de enviar: no se marca antes de tiempo el
      // campo que la persona todavía no visita.
      if (all[field] && all[field] !== feedback.forms.errors.phoneOrEmail)
        shown[field] = all[field];
    }
    return shown;
  };

  const revalidate = async () => {
    if (!form.current) return;
    const all = await validate(readValues(form.current));
    if (all) setErrors(visibleErrors(all, submitted.current));
  };

  const onBlur = (event: { target: EventTarget }) => {
    const name = (event.target as HTMLInputElement).name as QuoteContactField;
    if (!QUOTE_CONTACT_FIELDS.includes(name)) return;
    touched.current.add(name);
    void revalidate();
  };

  const onChange = (event: { target: EventTarget }) => {
    if (!form.current) return;
    const values = readValues(form.current);
    saveDraft(values);
    const name = (event.target as HTMLInputElement).name;
    if (name === "customerType") setCustomerType(values.customerType ?? "");
    // Un campo con error se revisa mientras se corrige (el aviso se va en cuanto queda bien).
    if (Object.keys(errors).length > 0) void revalidate();
  };

  const focusField = (field: QuoteContactField) => {
    const el = form.current;
    if (!el) return;
    const target =
      field === "customerType"
        ? (el.querySelector<HTMLInputElement>('input[name="customerType"]:checked') ??
          el.querySelector<HTMLInputElement>('input[name="customerType"]'))
        : document.getElementById(IDS[field]);
    target?.focus();
  };

  const send = async (values: QuoteDraft): Promise<void> => {
    setSending(true);
    let result: Awaited<ReturnType<typeof submitQuote>> | null = null;
    try {
      result = await submitQuote(
        values,
        lines.map(({ type, ref, packaging, quantity }) => ({ type, ref, packaging, quantity })),
      );
    } catch {
      result = null; // sin red o el servidor no respondió: mismo aviso que un fallo
    } finally {
      setSending(false);
    }
    if (result?.ok) {
      clearDraft();
      useQuote.getState().clear();
      openDialog(feedback.quote.sent(result.data.folio), {
        kind: "success",
        onPrimary: () => router.push(`/cotizacion/enviada/${result.data.folio}` as Route),
      });
      return;
    }
    if (result?.error === "invalid" && result.fields) {
      // Si fue un reintento desde el diálogo, se cierra antes de llevar el foco al campo.
      closeDialog();
      setErrors(result.fields);
      const first = QUOTE_CONTACT_FIELDS.find((field) => result.fields?.[field]);
      if (first) focusField(first);
      void showToast(feedback.forms.invalid);
      return;
    }
    // No se pudo enviar: los productos siguen guardados; reintentar o mandarla por WhatsApp.
    const { secondary, ...failed } = feedback.quote.failed;
    openDialog(whatsappUrl ? { ...failed, secondary } : failed, {
      kind: "error",
      onPrimary: () => send(values),
      onSecondary: whatsappUrl
        ? () => void window.open(whatsappUrl, "_blank", "noopener,noreferrer")
        : undefined,
    });
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // checking: mientras se valida (el esquema puede estar descargándose) un segundo envío no
    // pasa; sending lo cubre después, mientras viaja.
    if (sending || checking.current || !form.current) return;
    checking.current = true;
    const values = readValues(form.current);
    submitted.current = true;
    // Sin el esquema (sin red), se envía igual: el servidor valida con el mismo y devuelve los
    // errores por campo.
    const all = (await validate(values)) ?? {};
    checking.current = false;
    setSubmitCount((n) => n + 1);
    for (const field of QUOTE_CONTACT_FIELDS) touched.current.add(field);
    setErrors(all);
    const first = QUOTE_CONTACT_FIELDS.find((field) => all[field]);
    if (first) {
      focusField(first);
      void showToast(feedback.forms.invalid);
      return;
    }
    void send(values);
  };

  const orgRequired = organizationRequired(customerType);

  return (
    <form
      ref={form}
      method="post"
      noValidate
      onSubmit={(event) => void onSubmit(event)}
      onFocus={() => void loadSchema().catch(() => {})}
      onBlur={onBlur}
      onChange={onChange}
      aria-busy={sending || undefined}
      className="flex flex-col gap-6"
    >
      {/* Mientras se envía, los campos quedan bloqueados (docs/08 §4): lo que se cambiara en ese
          momento no viajaría. El botón queda fuera, con su spinner y el foco. */}
      <fieldset disabled={sending} className="flex min-w-0 flex-col gap-6">
        <RadioCards
          id={IDS.customerType}
          name="customerType"
          legend={t.customerType}
          required
          options={[...t.customerOptions]}
          error={errors.customerType}
          shakeKey={submitCount}
        />
        <Field
          id={IDS.organization}
          label={orgRequired ? t.organization : `${t.organization} ${t.optional}`}
          required={orgRequired}
          error={errors.organization}
          shakeKey={submitCount}
        >
          <Input
            name="organization"
            autoComplete="organization"
            maxLength={QUOTE_FIELD_MAX.organization}
          />
        </Field>
        <Field id={IDS.name} label={t.name} required error={errors.name} shakeKey={submitCount}>
          <Input name="name" autoComplete="name" maxLength={QUOTE_FIELD_MAX.name} />
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
            {/* La regla «al menos uno de los dos» (ayuda de Teléfono) también se anuncia aquí. */}
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
            error={errors.municipality}
            shakeKey={submitCount}
          >
            <Input
              name="municipality"
              autoComplete="address-level2"
              maxLength={QUOTE_FIELD_MAX.municipality}
            />
          </Field>
        </div>
        <Field
          id={IDS.notes}
          label={t.notes}
          hint={t.notesHint}
          error={errors.notes}
          shakeKey={submitCount}
        >
          <Textarea name="notes" maxLength={QUOTE_FIELD_MAX.notes} />
        </Field>
      </fieldset>
      <div className="flex flex-col gap-3">
        <Button
          type="submit"
          block
          size="lg"
          loading={sending}
          loadingText={feedback.quote.sending.title}
        >
          {t.submit}
        </Button>
        <p className="text-center text-sm text-muted">{t.note}</p>
      </div>
    </form>
  );
}
