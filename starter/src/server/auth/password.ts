import "server-only";
import bcrypt from "bcryptjs";

const COST = 12;
export const MAX_FAILED_LOGINS = 5;
export const LOCK_MINUTES = 15;

export const hashPassword = (plain: string) => bcrypt.hash(plain, COST);
export const verifyPassword = (plain: string, hash: string) => bcrypt.compare(plain, hash);

/** Hash válido de una contraseña aleatoria: se compara cuando el usuario no existe, para que la
 *  respuesta tarde lo mismo y no revele qué correos están registrados. */
let dummyHash: string | undefined;
export async function burnTime(plain: string) {
  dummyHash ??= await bcrypt.hash(crypto.randomUUID(), COST);
  await bcrypt.compare(plain, dummyHash);
}

/** Mínimo 12 caracteres con letras y números (se valida también con Zod en el formulario). */
export function isStrongPassword(plain: string) {
  return plain.length >= 12 && /[a-zA-Z]/.test(plain) && /\d/.test(plain);
}
