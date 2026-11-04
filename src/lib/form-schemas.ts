import { z } from "zod";
import { feedback } from "@/content/feedback";
import { QUOTE_LIMITS } from "./constants";
import { normalizeGtPhone } from "./format";

/**
 * Piezas de Zod que comparten todos los formularios (BD-022), en cliente y en servidor. Los
 * mensajes salen de feedback.forms.errors (doc 17 §5): ningún esquema escribe textos sueltos ni
 * deja pasar los de Zod (en inglés). Un campo vacío ("" o solo espacios) cuenta como no escrito.
 */

const errors = feedback.forms.errors;

/** Texto (o lo que llegue en su lugar): si no es texto, pide el dato. */
const text = () => z.string({ error: errors.required });

/** Texto obligatorio, sin espacios a los lados. */
export const requiredText = (max = 160) =>
  text().trim().min(1, errors.required).max(max, errors.tooLong(max));

/** Texto opcional: "" pasa a undefined. */
export const optionalText = (max = 160) =>
  text()
    .trim()
    .max(max, errors.tooLong(max))
    .transform((value) => value || undefined)
    .optional();

/** Teléfono de Guatemala; se guarda con sus 8 dígitos ("55551234"). */
export const gtPhone = text()
  .trim()
  .min(1, errors.required)
  .refine((value) => normalizeGtPhone(value) !== null, errors.phone)
  .transform((value) => normalizeGtPhone(value)!);

/** Teléfono opcional: vacío es undefined; si se escribe, debe ser válido. */
export const optionalGtPhone = text()
  .trim()
  .refine((value) => value === "" || normalizeGtPhone(value) !== null, errors.phone)
  .transform((value) => (value === "" ? undefined : normalizeGtPhone(value)!))
  .optional();

export const email = text()
  .trim()
  .min(1, errors.required)
  .pipe(z.email(errors.email).max(160, errors.tooLong(160)));

/** Correo opcional: vacío es undefined; si se escribe, debe ser válido. */
export const optionalEmail = text()
  .trim()
  .refine((value) => value === "" || z.email().max(160).safeParse(value).success, errors.email)
  .transform((value) => value || undefined)
  .optional();

/** NIT de Guatemala (dígitos y un verificador 0-9 o K, con o sin guion) o "CF". */
export const nit = text()
  .trim()
  .toUpperCase()
  .transform((value) => value.replace(/[\s-]/g, ""))
  .refine((value) => value === "CF" || /^\d{1,12}[\dK]$/.test(value), errors.nit);

/**
 * Cantidad de una línea de cotización: entero de 1 a 9,999 (más, por WhatsApp). Acepta un número o
 * un texto de solo dígitos (FormData): nada de "1e3", "0x10" ni true.
 */
export const quantity = z
  .union([z.number(), z.string().trim().regex(/^\d+$/).transform(Number)], {
    error: errors.qtyMin,
  })
  .pipe(
    z
      .number()
      .int(errors.qtyMin)
      .min(QUOTE_LIMITS.minQty, errors.qtyMin)
      .max(QUOTE_LIMITS.maxQty, errors.qtyMax),
  );

/** Para un objeto con phone y email opcionales: al menos uno de los dos. */
export function requirePhoneOrEmail<T extends { phone?: string; email?: string }>(
  value: T,
  ctx: z.RefinementCtx,
) {
  if (!value.phone && !value.email) {
    for (const path of ["phone", "email"])
      ctx.addIssue({ code: "custom", path: [path], message: errors.phoneOrEmail });
  }
}

/**
 * Agrega a un esquema de objeto la regla «al menos un teléfono o un correo». Corre aunque otros
 * campos tengan error (when): así el visitante ve todos los problemas en el primer envío. Zod 4,
 * por defecto, salta las reglas del objeto si algún campo ya falló. Solo si llegó un objeto:
 * una petición mal formada (null, texto) recibe el error de tipo, no una excepción.
 * En el formulario, registra phone y email con deps mutuas solo después del primer envío
 * (deps: submitCount > 0 ? ["email"] : []): el aviso se borra de los dos al corregir uno, sin
 * marcar antes de tiempo el campo que la persona todavía no visita.
 */
export function withPhoneOrEmail<S extends z.ZodType<{ phone?: string; email?: string }>>(
  schema: S,
) {
  return schema.superRefine(requirePhoneOrEmail, {
    when: ({ value }) => typeof value === "object" && value !== null,
  });
}
