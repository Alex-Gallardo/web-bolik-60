"use server";

import { after } from "next/server";
import { feedback } from "@/content/feedback";
import type { FormMeta } from "@/lib/form-guard";
import { saveDistributorApplication } from "@/server/data/form-requests";
import { departmentName } from "@/server/data/quote-requests";
import {
  FORM_IP_LIMIT,
  fakeFolio,
  submitGuardedForm,
  type FormSubmitResult,
} from "@/server/form-submit";
import { sendDistributorEmails } from "@/server/mail/send-request-emails";
import type { DistributorField } from "./form-fields";
import { distributorErrors, distributorSchema } from "./schema";

export type SubmitDistributorResult = FormSubmitResult<DistributorField, { folio: string }>;

/**
 * Solicitud para ser distribuidor (BD-076, docs/06 §3.10): valida, guarda con su folio DIS y
 * responde; el correo a la bandeja de distribuidores y el acuse van después con after(). Campo
 * trampa lleno: éxito falso con un folio que no existe (decisión del usuario). Nunca lanza.
 */
export async function submitDistributor(
  values: unknown,
  meta: FormMeta = {},
): Promise<SubmitDistributorResult> {
  return submitGuardedForm({
    form: "distributor",
    meta,
    values,
    schema: distributorSchema,
    errors: distributorErrors,
    fake: () => ({ folio: fakeFolio("DIS") }),
    save: async (data, ipHash) => {
      const department = await departmentName(data.department);
      if (!department)
        return {
          ok: false,
          error: "invalid",
          fields: { department: feedback.forms.errors.required },
        };
      const saved = await saveDistributorApplication({ data, ipHash }, FORM_IP_LIMIT);
      const folio = saved.folio!;
      after(() =>
        sendDistributorEmails({
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
