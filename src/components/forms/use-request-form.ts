"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  closeDialog,
  openDialog,
  retryableImport,
  showToast,
} from "@/components/feedback/feedback-store";
import { feedback } from "@/content/feedback";
import type { FormMeta } from "@/lib/form-guard";
// Solo el tipo: se borra al compilar (el módulo es de servidor).
import type { FormSubmitResult as Result } from "@/server/form-submit";

type Errors<F extends string> = Partial<Record<F, string>>;
type Values<F extends string> = Partial<Record<F, string>>;

type FailedMessage = {
  title: string;
  body: string;
  bodyNoWhatsapp: string;
  primary: string;
  secondary: string;
};

type Options<F extends string, D> = {
  /** Campos en el orden en que aparecen (el foco va al primero con error). */
  fields: readonly F[];
  /** La función de errores del esquema; se descarga al primer uso (`zod/mini`, docs/12 §2). */
  loadErrors: () => Promise<(values: unknown) => Errors<F>>;
  submit: (values: Values<F>, meta: FormMeta) => Promise<Result<F, D>>;
  /**
   * Éxito: el diálogo y el evento de cada formulario. El formulario ya quedó vacío. `trapped`: el
   * campo trampa iba lleno (un bot recibió el éxito falso): sin evento de conversión.
   */
  onSuccess: (data: D, values: Values<F>, info: { trapped: boolean }) => void;
  /** Diálogo de «no se pudo» (feedback.forms.failed o contactFailed). */
  failed: FailedMessage;
  /** Enlace de WhatsApp general; null sin número en los ajustes. */
  whatsappUrl: string | null;
};

/** Milisegundos desde `start` (reloj monotónico del navegador; con 0, desde que abrió la página). */
const msSince = (start: number) => performance.now() - start;

/**
 * El comportamiento común de los formularios de escuelas, distribuidores y contacto (BD-076), el
 * mismo que el de la cotización (BD-072, BD-073): valida con el esquema de la Server Action al salir
 * de cada campo y al enviar; con errores, foco en el primero y toast `forms.invalid`; manda el campo
 * trampa y el tiempo de llenado (BD-077); responde a cada error con su mensaje (docs/08 §4). Los
 * campos no son controlados: se leen con FormData.
 */
export function useRequestForm<F extends string, D>({
  fields,
  loadErrors,
  submit,
  onSuccess,
  failed,
  whatsappUrl,
}: Options<F, D>) {
  const form = useRef<HTMLFormElement>(null);
  const [errors, setErrors] = useState<Errors<F>>({});
  const [submitCount, setSubmitCount] = useState(0);
  const [sending, setSending] = useState(false);
  /** Campos que la persona ya visitó: solo esos muestran su error antes del primer envío. */
  const touched = useRef(new Set<F>());
  /** Ya se intentó enviar (ref: el blur del foco al primer error no debe esconder avisos). */
  const submitted = useRef(false);
  const checking = useRef(false);
  /** Un envío en curso (ref: el estado `sending` llega un render tarde para un doble clic). */
  const inFlight = useRef(false);
  /** Cuándo se abrió el formulario: tiempo mínimo de llenado (BD-077). */
  const openedAt = useRef(0);
  const [load] = useState(() => retryableImport(loadErrors));

  useEffect(() => {
    openedAt.current = msSince(0);
  }, []);

  const isField = (name: string): name is F => (fields as readonly string[]).includes(name);

  const readValues = (): Values<F> => {
    const values: Values<F> = {};
    if (!form.current) return values;
    const data = new FormData(form.current);
    for (const field of fields) {
      const value = data.get(field);
      if (typeof value === "string") values[field] = value;
    }
    return values;
  };

  /** Errores por campo; null si el esquema no se pudo descargar (sin red: valida el servidor). */
  const validate = async (values: Values<F>): Promise<Errors<F> | null> => {
    try {
      return (await load())(values);
    } catch {
      return null;
    }
  };

  /** Los de campos visitados, o todos después de enviar. */
  const visibleErrors = (all: Errors<F>): Errors<F> => {
    if (submitted.current) return all;
    const shown: Errors<F> = {};
    for (const field of touched.current) {
      // «Al menos un teléfono o un correo» solo después de enviar.
      if (all[field] && all[field] !== feedback.forms.errors.phoneOrEmail)
        shown[field] = all[field];
    }
    return shown;
  };

  const revalidate = async () => {
    const all = await validate(readValues());
    if (all) setErrors(visibleErrors(all));
  };

  const focusField = (field: F) => {
    const control = form.current?.elements.namedItem(field);
    if (control instanceof RadioNodeList) {
      const radios = [...control].filter(
        (r): r is HTMLInputElement => r instanceof HTMLInputElement,
      );
      (radios.find((r) => r.checked) ?? radios[0])?.focus();
    } else if (control instanceof HTMLElement) control.focus();
  };

  const openWhatsApp = () => {
    if (whatsappUrl) window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  };

  const send = async (values: Values<F>): Promise<void> => {
    if (inFlight.current) return;
    inFlight.current = true;
    setSending(true);
    const website = form.current ? new FormData(form.current).get("website") : "";
    let result: Result<F, D> | null = null;
    try {
      result = await submit(values, { website, elapsedMs: msSince(openedAt.current) });
    } catch {
      result = null; // sin red o el servidor no respondió: mismo aviso que un fallo
    } finally {
      inFlight.current = false;
      setSending(false);
    }
    if (result?.ok) {
      form.current?.reset();
      touched.current.clear();
      submitted.current = false;
      // Un segundo envío desde el mismo formulario vuelve a contar su tiempo mínimo.
      openedAt.current = msSince(0);
      setErrors({});
      onSuccess(result.data, values, {
        trapped: typeof website === "string" && website.trim() !== "",
      });
      return;
    }
    if (result?.error === "tooFast") {
      void showToast(feedback.forms.tooFast);
      return;
    }
    if (result?.error === "rateLimited") {
      const { title, body, bodyNoWhatsapp, primary, secondary } = feedback.forms.rateLimited;
      openDialog(
        whatsappUrl
          ? { title, body, primary, secondary }
          : { title, body: bodyNoWhatsapp, primary: secondary },
        { kind: "error", onPrimary: whatsappUrl ? openWhatsApp : undefined },
      );
      return;
    }
    if (result?.error === "invalid" && result.fields) {
      closeDialog();
      setErrors(result.fields);
      const first = fields.find((field) => result.fields?.[field]);
      if (first) focusField(first);
      void showToast(feedback.forms.invalid);
      return;
    }
    // No se pudo enviar: lo escrito sigue en el formulario; reintentar o escribir por WhatsApp.
    const { title, body, bodyNoWhatsapp, primary, secondary } = failed;
    openDialog(
      whatsappUrl ? { title, body, primary, secondary } : { title, body: bodyNoWhatsapp, primary },
      {
        kind: "error",
        onPrimary: () => send(values),
        onSecondary: whatsappUrl ? openWhatsApp : undefined,
        note: result?.reference
          ? feedback.system.genericError.reference(result.reference)
          : undefined,
      },
    );
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (sending || inFlight.current || checking.current || !form.current) return;
    checking.current = true;
    const values = readValues();
    submitted.current = true;
    // Sin el esquema (sin red) se envía igual: el servidor valida con el mismo.
    const all: Errors<F> = (await validate(values)) ?? {};
    checking.current = false;
    setSubmitCount((n) => n + 1);
    for (const field of fields) touched.current.add(field);
    setErrors(all);
    const first = fields.find((field) => all[field]);
    if (first) {
      focusField(first);
      void showToast(feedback.forms.invalid);
      return;
    }
    void send(values);
  };

  const formProps = {
    ref: form,
    method: "post",
    noValidate: true,
    "aria-busy": sending || undefined,
    onSubmit: (event: FormEvent<HTMLFormElement>) => void onSubmit(event),
    // El esquema se precarga al entrar al formulario.
    onFocus: () => void load().catch(() => {}),
    onBlur: (event: { target: EventTarget }) => {
      const name = (event.target as HTMLInputElement).name;
      if (!isField(name)) return;
      touched.current.add(name);
      void revalidate();
    },
    // Un campo con error se revisa mientras se corrige.
    onChange: () => {
      if (Object.keys(errors).length > 0) void revalidate();
    },
  };

  return { formProps, errors, submitCount, sending };
}
