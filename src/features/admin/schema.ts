import { email, maxLength, minLength, object, refine, safeParse, string, trim } from "zod/mini";
import { feedback } from "@/content/feedback";

const errors = feedback.forms.errors;
const emailFormat = email();

/**
 * Formulario de login (BD-114), validado en el servidor (el navegador ya pide los dos campos con
 * `required` y `type="email"`). La contraseña no se recorta (un espacio puede ser parte de ella) y
 * tiene el tope de bcrypt: más de 72 bytes se truncarían sin aviso.
 */
export const loginSchema = object({
  email: string({ error: errors.required }).check(
    trim(),
    minLength(1, errors.required),
    maxLength(160, errors.tooLong(160)),
    refine((value) => safeParse(emailFormat, value).success, errors.email),
  ),
  password: string({ error: errors.required }).check(
    minLength(1, errors.required),
    refine((value) => new TextEncoder().encode(value).length <= 72, errors.tooLong(72)),
  ),
});
