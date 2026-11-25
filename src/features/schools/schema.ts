import { object, superRefine, type output } from "zod/mini";
import { MONTHS, SCHOOL_LEVELS } from "@/lib/constants";
import {
  departmentSlug,
  fieldErrors,
  optionalChoice,
  optionalCount,
  optionalEmail,
  optionalGtPhone,
  requiredChoice,
  requiredText,
  requirePhoneOrEmail,
} from "@/lib/form-schemas-mini";
import { SCHOOL_FIELD_MAX, SCHOOL_MAX_STUDENTS, type SchoolField } from "./form-fields";

/**
 * Solicitud de visita escolar (BD-076, doc 17 §4 `/escuelas`), compartida por el formulario y la
 * Server Action. Obligatorios: colegio, nivel, departamento, municipio, nombre y teléfono o correo.
 */
export const schoolVisitSchema = object({
  schoolName: requiredText(SCHOOL_FIELD_MAX.schoolName),
  level: requiredChoice(SCHOOL_LEVELS),
  students: optionalCount(SCHOOL_MAX_STUDENTS),
  department: departmentSlug,
  municipality: requiredText(SCHOOL_FIELD_MAX.municipality),
  name: requiredText(SCHOOL_FIELD_MAX.name),
  phone: optionalGtPhone,
  email: optionalEmail,
  preferredMonth: optionalChoice(MONTHS),
}).check(
  // Corre aunque otros campos tengan error: el visitante ve todo en el primer envío.
  superRefine((value, ctx) => requirePhoneOrEmail(value, ctx), {
    when: ({ value }) => typeof value === "object" && value !== null,
  }),
);

export type SchoolVisit = output<typeof schoolVisitSchema>;

export const schoolVisitErrors = (values: unknown) =>
  fieldErrors<SchoolField>(schoolVisitSchema, values);
