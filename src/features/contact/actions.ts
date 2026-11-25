"use server";

import { after } from "next/server";
import type { FormMeta } from "@/lib/form-guard";
import { saveContactMessage } from "@/server/data/form-requests";
import { FORM_IP_LIMIT, submitGuardedForm, type FormSubmitResult } from "@/server/form-submit";
import { sendContactEmails } from "@/server/mail/send-request-emails";
import type { ContactField } from "./form-fields";
import { contactErrors, contactSchema } from "./schema";

export type SubmitContactResult = FormSubmitResult<ContactField, null>;

/**
 * Mensaje de contacto (BD-076, docs/06 §3.15): valida, guarda y responde; el correo a Ventas va
 * después con after(). Sin folio ni acuse. Campo trampa lleno: éxito falso, sin guardar. Nunca
 * lanza.
 */
export async function submitContact(
  values: unknown,
  meta: FormMeta = {},
): Promise<SubmitContactResult> {
  return submitGuardedForm({
    form: "contact",
    meta,
    values,
    schema: contactSchema,
    errors: contactErrors,
    fake: () => null,
    save: async (data, ipHash) => {
      const saved = await saveContactMessage({ data, ipHash }, FORM_IP_LIMIT);
      after(() => sendContactEmails({ ...data, id: saved.id, createdAt: new Date() }));
      return { ok: true, data: null };
    },
  });
}
