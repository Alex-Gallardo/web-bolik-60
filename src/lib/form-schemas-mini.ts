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
  enum as zEnum,
  regex,
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

/**
 * NIT opcional (BD-076): vacío es undefined; si se escribe, "CF" o dígitos con su verificador (0-9 o
 * K), con o sin guion, como `nit` de lib/form-schemas.ts. Se guarda sin espacios ni guion: "1234567K".
 */
export const optionalNit = optional(
  pipe(
    pipe(
      text().check(trim()),
      transform((value: string) => value.toUpperCase().replace(/[\s-]/g, "")),
    ),
    pipe(
      string().check(
        refine((value) => value === "" || value === "CF" || /^\d{1,12}[\dK]$/.test(value), {
          error: errors.nit,
        }),
      ),
      emptyToUndefined,
    ),
  ),
);

/**
 * Número entero opcional de 1 a `max` (BD-076, «Alumnos aproximados»): llega como texto del
 * formulario; vacío es undefined. Solo dígitos (con separador de miles), nada de "1e3" ni "-5".
 */
export const optionalCount = (max: number) =>
  optional(
    pipe(
      text().check(
        trim(),
        refine((value) => {
          if (value === "") return true;
          const digits = value.replace(/[,\s]/g, "");
          return /^\d+$/.test(digits) && Number(digits) >= 1 && Number(digits) <= max;
        }, errors.count(max)),
      ),
      transform((value) => (value === "" ? undefined : Number(value.replace(/[,\s]/g, "")))),
    ),
  );

/** Una opción de la lista: lo que no sea una de ellas pide el dato. */
export const requiredChoice = <const T extends readonly [string, ...string[]]>(values: T) =>
  zEnum(values, { error: errors.required });

/** Una opción opcional: "" (sin elegir) es undefined. */
export const optionalChoice = <const T extends readonly [string, ...string[]]>(values: T) =>
  optional(
    pipe(
      text().check(
        refine(
          (value) => value === "" || (values as readonly string[]).includes(value),
          errors.required,
        ),
      ),
      transform((value) => (value === "" ? undefined : (value as T[number]))),
    ),
  );

/** Slug de un departamento; que exista lo comprueba la Server Action. */
export const departmentSlug = requiredText(40).check(
  regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, errors.required),
);

/**
 * Errores por campo (el primero de cada uno), para pintarlos junto a su control. Lo usan el
 * formulario (al salir de cada campo y al enviar) y la Server Action (para devolverlos).
 */
export function fieldErrors<F extends string>(
  schema: core.$ZodType,
  values: unknown,
): Partial<Record<F, string>> {
  const result = safeParse(schema, values);
  if (result.success) return {};
  const byField: Partial<Record<F, string>> = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0] as F | undefined;
    if (typeof field === "string" && !byField[field]) byField[field] = issue.message;
  }
  return byField;
}

/** Al menos un teléfono o un correo: el aviso va en los dos campos. */
export function requirePhoneOrEmail(
  value: { phone?: string; email?: string },
  ctx: { issues: core.$ZodRawIssue[] },
) {
  if (value.phone || value.email) return;
  for (const path of ["phone", "email"])
    ctx.issues.push({ code: "custom", path: [path], message: errors.phoneOrEmail, input: value });
}
