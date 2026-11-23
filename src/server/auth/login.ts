import "server-only";
import { createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import { LOGIN_LOCK_MINUTES, LOGIN_MAX_ATTEMPTS } from "@/lib/admin-access";
import type { Role } from "@/lib/constants";
import {
  findAdminForLogin,
  recordLoginFailure,
  recordLoginSuccess,
} from "@/server/data/admin-users";

/**
 * Comprobar correo y contraseña (BD-114, docs/03 §8). No escribe la cookie: lo hace la acción con
 * el resultado. Un correo que no existe responde igual que uno real: bcrypt corre siempre (con un
 * hash de relleno), el error es el mismo y también se «bloquea» al quinto intento (contador en
 * memoria), así el mensaje de bloqueo no confirma qué correos están registrados. El tiempo lo
 * empareja la acción con un mínimo de respuesta. Un usuario inactivo responde como inválido.
 */
export type LoginOutcome =
  | { ok: true; user: { id: number; name: string; role: Role } }
  | { ok: false; error: "invalid" | "locked" };

/**
 * Hash de bcrypt de 24 bytes aleatorios que nadie conoce, con el mismo coste que los reales
 * (BCRYPT_COST, lo comprueba una prueba): solo sirve para que un correo que no existe tarde lo
 * mismo que uno que sí.
 */
export const DUMMY_HASH = "$2b$12$a0/jN/ScvA2.xG74NcUJUeJchfbGlXu2T2oNVxjvtalkG8TRhbb8K";

/** Correos que no existen: intentos por hash del correo, con el mismo bloqueo que los reales. */
type Ghost = { failures: number; lockedUntil: number };
const ghosts = new Map<string, Ghost>();
/** Tope de memoria: al llenarse se olvidan los más viejos (Map conserva el orden de inserción). */
const MAX_GHOSTS = 5_000;

const emailKey = (email: string) =>
  createHash("sha256").update(email.trim().toLowerCase()).digest("hex");

function ghostAttempt(email: string, now: Date): LoginOutcome {
  const key = emailKey(email);
  const ghost = ghosts.get(key) ?? { failures: 0, lockedUntil: 0 };
  if (ghost.lockedUntil > now.getTime()) return { ok: false, error: "locked" };
  ghost.failures += 1;
  if (ghost.failures >= LOGIN_MAX_ATTEMPTS) {
    ghost.failures = 0;
    ghost.lockedUntil = now.getTime() + LOGIN_LOCK_MINUTES * 60_000;
  }
  ghosts.delete(key);
  ghosts.set(key, ghost);
  if (ghosts.size > MAX_GHOSTS) ghosts.delete(ghosts.keys().next().value!);
  return { ok: false, error: ghost.lockedUntil > now.getTime() ? "locked" : "invalid" };
}

export async function authenticate(
  email: string,
  password: string,
  ipHash: string,
  now = new Date(),
): Promise<LoginOutcome> {
  const user = await findAdminForLogin(email);
  const matches = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !user.active) return ghostAttempt(email, now);
  // Bloqueada: ni siquiera una contraseña correcta entra hasta que pase el tiempo.
  if (user.lockedUntil && user.lockedUntil > now) return { ok: false, error: "locked" };
  if (!matches) {
    const { locked } = await recordLoginFailure(user.id, ipHash, now);
    return { ok: false, error: locked ? "locked" : "invalid" };
  }
  // Otro intento de la misma ráfaga pudo bloquearla mientras corría bcrypt.
  if (!(await recordLoginSuccess(user.id, ipHash, now))) return { ok: false, error: "locked" };
  return { ok: true, user: { id: user.id, name: user.name, role: user.role } };
}
