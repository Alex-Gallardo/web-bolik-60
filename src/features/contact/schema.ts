import { object, superRefine, type output } from "zod/mini";
import { CONTACT_SUBJECTS } from "@/lib/constants";
import {
  fieldErrors,
  optionalEmail,
  optionalGtPhone,
  requiredChoice,
  requiredText,
  requirePhoneOrEmail,
} from "@/lib/form-schemas-mini";
import { CONTACT_FIELD_MAX, type ContactField } from "./form-fields";

/**
 * Mensaje de contacto (BD-076, docs/06 §3.15), compartido por el formulario y la Server Action:
 * asunto, nombre, teléfono o correo y mensaje.
 */
export const contactSchema = object({
  subject: requiredChoice(CONTACT_SUBJECTS),
  name: requiredText(CONTACT_FIELD_MAX.name),
  phone: optionalGtPhone,
  email: optionalEmail,
  message: requiredText(CONTACT_FIELD_MAX.message),
}).check(
  superRefine((value, ctx) => requirePhoneOrEmail(value, ctx), {
    when: ({ value }) => typeof value === "object" && value !== null,
  }),
);

export type ContactRequest = output<typeof contactSchema>;

export const contactErrors = (values: unknown) => fieldErrors<ContactField>(contactSchema, values);
