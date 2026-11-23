import {
  array,
  number,
  regex,
  enum as zEnum,
  superRefine,
  object,
  string,
  trim,
  minLength,
  maxLength,
  optional,
  int,
  minimum,
  maximum,
  safeParse,
  type input,
  type output,
} from "zod/mini";
import { feedback } from "@/content/feedback";
import { PACKAGING_CODES, QUOTE_ITEM_TYPES, QUOTE_LIMITS } from "@/lib/constants";
import {
  optionalEmail,
  optionalGtPhone,
  optionalText,
  requirePhoneOrEmail,
  requiredText,
} from "@/lib/form-schemas-mini";
import {
  QUOTE_FIELD_MAX,
  QUOTE_FORM_CUSTOMER_TYPES,
  organizationRequired,
  type QuoteContactField,
} from "./form-fields";

export {
  QUOTE_CONTACT_FIELDS,
  QUOTE_FIELD_MAX,
  QUOTE_FORM_CUSTOMER_TYPES,
  organizationRequired,
  type QuoteContactField,
} from "./form-fields";

/**
 * Esquema de la cotización (BD-072, docs/06 §3.16), compartido por el formulario de /cotizacion y
 * la Server Action que la guarda (BD-073). En `zod/mini`: Zod completo no cabe en el JS de la
 * página (docs/12 §2), y aun así el formulario lo descarga al interactuar, no al cargar. Lo que no
 * necesita Zod (campos, largos, tipos) está en form-fields.ts.
 */

const errors = feedback.forms.errors;

/** Slug de un departamento. Que exista en la base lo comprueba la Server Action con BD-073. */
const departmentSlug = requiredText(QUOTE_FIELD_MAX.department).check(
  regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, errors.required),
);

/**
 * Datos de contacto: lo que llena el visitante. Obligatorios (criterio de BD-072, ≤ 6): tipo de
 * cliente, institución (salvo «Otro»), nombre, teléfono o correo (uno) y departamento.
 */
export const quoteContactSchema = object({
  customerType: zEnum(QUOTE_FORM_CUSTOMER_TYPES, { error: errors.required }),
  organization: optionalText(QUOTE_FIELD_MAX.organization),
  name: requiredText(QUOTE_FIELD_MAX.name),
  phone: optionalGtPhone,
  email: optionalEmail,
  department: departmentSlug,
  municipality: optionalText(QUOTE_FIELD_MAX.municipality),
  notes: optionalText(QUOTE_FIELD_MAX.notes),
}).check(
  // Corren aunque otros campos tengan error: el visitante ve todos los problemas en el primer
  // envío (como withPhoneOrEmail de lib/form-schemas.ts).
  superRefine(
    (value, ctx) => {
      requirePhoneOrEmail(value, ctx);
      if (organizationRequired(value.customerType) && !value.organization)
        ctx.issues.push({
          code: "custom",
          path: ["organization"],
          message: errors.required,
          input: value,
        });
    },
    { when: ({ value }) => typeof value === "object" && value !== null },
  ),
);

/** Una línea tal como la manda el navegador; nombre y detalle los pone el servidor (BD-073). */
export const quoteLineSchema = object({
  type: zEnum(QUOTE_ITEM_TYPES),
  ref: string().check(trim(), minLength(1), maxLength(80)),
  packaging: optional(zEnum(PACKAGING_CODES)),
  quantity: number().check(
    int(errors.qtyMin),
    minimum(QUOTE_LIMITS.minQty, errors.qtyMin),
    maximum(QUOTE_LIMITS.maxQty, errors.qtyMax),
  ),
});

export const quoteLinesSchema = array(quoteLineSchema).check(
  minLength(1),
  maxLength(QUOTE_LIMITS.maxLines),
);

export type QuoteContactInput = input<typeof quoteContactSchema>;
export type QuoteContact = output<typeof quoteContactSchema>;
export type QuoteLineInput = output<typeof quoteLineSchema>;

/** Errores por campo (el primero de cada uno), para pintarlos junto a su control. */
export function contactErrors(values: unknown): Partial<Record<QuoteContactField, string>> {
  const result = safeParse(quoteContactSchema, values);
  if (result.success) return {};
  const byField: Partial<Record<QuoteContactField, string>> = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0] as QuoteContactField | undefined;
    if (field && !byField[field]) byField[field] = issue.message;
  }
  return byField;
}
