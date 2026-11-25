import { object, superRefine, type output } from "zod/mini";
import { DISTRIBUTOR_BUSINESS_TYPES } from "@/lib/constants";
import {
  departmentSlug,
  fieldErrors,
  optionalEmail,
  optionalGtPhone,
  optionalNit,
  requiredChoice,
  requiredText,
  requirePhoneOrEmail,
} from "@/lib/form-schemas-mini";
import { DISTRIBUTOR_FIELD_MAX, type DistributorField } from "./form-fields";

/**
 * Solicitud para ser distribuidor (BD-076, doc 17 §4 `/mayoreo`), compartida por el formulario y la
 * Server Action. Obligatorios: negocio, tipo, departamento, municipio, nombre y teléfono o correo;
 * el NIT es opcional.
 */
export const distributorSchema = object({
  businessName: requiredText(DISTRIBUTOR_FIELD_MAX.businessName),
  businessType: requiredChoice(DISTRIBUTOR_BUSINESS_TYPES),
  nit: optionalNit,
  department: departmentSlug,
  municipality: requiredText(DISTRIBUTOR_FIELD_MAX.municipality),
  name: requiredText(DISTRIBUTOR_FIELD_MAX.name),
  phone: optionalGtPhone,
  email: optionalEmail,
}).check(
  superRefine((value, ctx) => requirePhoneOrEmail(value, ctx), {
    when: ({ value }) => typeof value === "object" && value !== null,
  }),
);

export type DistributorRequest = output<typeof distributorSchema>;

export const distributorErrors = (values: unknown) =>
  fieldErrors<DistributorField>(distributorSchema, values);
