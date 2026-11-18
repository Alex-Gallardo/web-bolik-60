import {
  string,
  transform,
  trim,
  minLength,
  maxLength,
  optional,
  pipe,
  refine,
  email,
  safeParse,
  type core,
} from "zod/mini";
import { feedback } from "@/content/feedback";
import { normalizeGtPhone } from "./format";

/**
 * Las piezas de lib/form-schemas.ts en `zod/mini`, para los formularios públicos (BD-072): mismas
 * reglas y mismos mensajes (feedback.forms.errors, doc 17 §5), mucho más livianas que Zod completo
 * (~92 KB gzip, que no cabe en el presupuesto de JS; docs/12 §2). Con Turbopack pesan ~25 KB, así
 * que el formulario las descarga al primer uso. El mismo esquema valida en el cliente y en el
 * servidor. Un campo vacío ("" o solo espacios) cuenta como
 * no escrito.
 */

const errors = feedback.forms.errors;

/** Texto (o lo que llegue en su lugar): si no es texto, pide el dato. */
const text = () => string({ error: errors.required });

/** "" pasa a undefined: un campo opcional sin escribir no se guarda como texto vacío. */
const emptyToUndefined = transform((value: string) => value || undefined);

/** Texto obligatorio, sin espacios a los lados. */
export const requiredText = (max = 160) =>
  text().check(trim(), minLength(1, errors.required), maxLength(max, errors.tooLong(max)));

/** Texto opcional: "" pasa a undefined. */
export const optionalText = (max = 160) =>
  optional(pipe(text().check(trim(), maxLength(max, errors.tooLong(max))), emptyToUndefined));

/** Teléfono de Guatemala opcional; se guarda con sus 8 dígitos ("55551234"). */
export const optionalGtPhone = optional(
  pipe(
    text().check(
      trim(),
      refine((value) => value === "" || normalizeGtPhone(value) !== null, errors.phone),
    ),
    transform((value) => (value === "" ? undefined : normalizeGtPhone(value)!)),
  ),
);

const emailFormat = email();

/** Correo opcional: vacío es undefined; si se escribe, debe ser válido (hasta 160). */
export const optionalEmail = optional(
  pipe(
    text().check(
      trim(),
      refine(
        (value) => value === "" || (value.length <= 160 && safeParse(emailFormat, value).success),
        errors.email,
      ),
    ),
    emptyToUndefined,
  ),
);

/** Al menos un teléfono o un correo: el aviso va en los dos campos. */
export function requirePhoneOrEmail(
  value: { phone?: string; email?: string },
  ctx: { issues: core.$ZodRawIssue[] },
) {
  if (value.phone || value.email) return;
  for (const path of ["phone", "email"])
    ctx.issues.push({ code: "custom", path: [path], message: errors.phoneOrEmail, input: value });
}
