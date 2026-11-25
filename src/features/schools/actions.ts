"use server";

import { after } from "next/server";
import { feedback } from "@/content/feedback";
import type { FormMeta } from "@/lib/form-guard";
import { saveSchoolVisit } from "@/server/data/form-requests";
import { departmentName } from "@/server/data/quote-requests";
import {
  FORM_IP_LIMIT,
  fakeFolio,
  submitGuardedForm,
  type FormSubmitResult,
} from "@/server/form-submit";
import { sendSchoolEmails } from "@/server/mail/send-request-emails";
import type { SchoolField } from "./form-fields";
import { schoolVisitErrors, schoolVisitSchema } from "./schema";

export type SubmitSchoolVisitResult = FormSubmitResult<SchoolField, { folio: string }>;

/**
 * Solicitud de visita escolar (BD-076, docs/06 §3.9): valida, guarda con su folio ESC y responde;
 * el correo a la bandeja de escuelas y el acuse van después con after(). Campo trampa lleno: éxito
 * falso con un folio que no existe (decisión del usuario). Nunca lanza.
 */
export async function submitSchoolVisit(
  values: unknown,
  meta: FormMeta = {},
): Promise<SubmitSchoolVisitResult> {
  return submitGuardedForm({
    form: "school",
    meta,
    values,
    schema: schoolVisitSchema,
    errors: schoolVisitErrors,
    fake: () => ({ folio: fakeFolio("ESC") }),
    save: async (data, ipHash) => {
      const department = await departmentName(data.department);
      if (!department)
        return {
          ok: false,
          error: "invalid",
          fields: { department: feedback.forms.errors.required },
        };
      const saved = await saveSchoolVisit({ data, ipHash }, FORM_IP_LIMIT);
      const folio = saved.folio!;
      after(() =>
        sendSchoolEmails({
          ...data,
          id: saved.id,
          folio,
          departmentName: department,
          createdAt: new Date(),
        }),
      );
      return { ok: true, data: { folio } };
    },
  });
}
