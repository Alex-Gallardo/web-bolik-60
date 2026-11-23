import "server-only";
import { createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import {
  LOGIN_IP_MAX_FAILURES,
  LOGIN_IP_WINDOW_MINUTES,
  LOGIN_LOCK_MINUTES,
  LOGIN_MAX_ATTEMPTS,
} from "@/lib/admin-access";
import type { Role } from "@/lib/constants";
import {
  findAdminForLogin,
  recordLoginFailure,
  recordLoginSuccess,
} from "@/server/data/admin-users";
import { log } from "@/server/log";
import { createRateLimiter } from "@/server/rate-limit";

/**
 * Comprobar correo y contraseña (BD-114, docs/03 §8). No escribe la cookie: lo hace la acción con
 * el resultado. Un correo que no existe responde igual que uno real: bcrypt corre siempre (con un
 * hash de relleno), el error es el mismo y también se «bloquea» al quinto intento (contador en
 * memoria), así el mensaje de bloqueo no confirma qué correos están registrados. El tiempo lo
 * empareja la acción con un mínimo de respuesta. Un usuario inactivo responde como inválido.
 *
 * Límite por IP (BD-077): 10 intentos fallidos en 15 minutos desde la misma IP, con cualquier
 * correo. Se revisa antes de buscar el correo y de bcrypt (~230 ms de CPU por intento en el proceso
 * que sirve el sitio): pasado el límite responde `locked`, el mismo aviso que una cuenta bloqueada.
 * Así quien prueba muchos correos desde una IP no gasta CPU ni bloquea cuentas ajenas sin freno.
 * Vive en memoria: un reinicio lo vacía (el bloqueo por cuenta sí queda en la base). Sin la IP real
 * del visitante (`limitByIp: false`: sin X-Forwarded-For o con la del propio servidor) no se aplica:
 * todos compartirían un cupo y diez fallos de cualquiera dejarían fuera al equipo entero.
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

const ipFailures = createRateLimiter({
  max: LOGIN_IP_MAX_FAILURES,
  windowMs: LOGIN_IP_WINDOW_MINUTES * 60_000,
});

/** Un aviso por minuto en el log: los rechazos no corren bcrypt y un bot los repite gratis. */
const WARN_EVERY_MS = 60_000;
let lastWarn = -Infinity;

/** Solo para pruebas: vacía los contadores en memoria (por IP y de correos que no existen). */
export function resetLoginMemory(): void {
  ipFailures.reset();
  ghosts.clear();
  lastWarn = -Infinity;
}

export async function authenticate(
  email: string,
  password: string,
  ipHash: string,
  now = new Date(),
  { limitByIp = true }: { limitByIp?: boolean } = {},
): Promise<LoginOutcome> {
  if (!limitByIp) return checkCredentials(email, password, ipHash, now);
  // Cuenta el intento antes de esperar nada (una ráfaga no se lo salta) y lo devuelve si entra.
  const slot = ipFailures.take(ipHash, now.getTime());
  if (!slot.ok) {
    if (now.getTime() - lastWarn >= WARN_EVERY_MS) {
      lastWarn = now.getTime();
      log.warn("Login rechazado: demasiados intentos fallidos desde la misma IP");
    }
    return { ok: false, error: "locked" };
  }
  let outcome: LoginOutcome;
  try {
    outcome = await checkCredentials(email, password, ipHash, now);
  } catch (error) {
    slot.release(); // falló la base, no el visitante
    throw error;
  }
  if (outcome.ok) slot.release();
  return outcome;
}

async function checkCredentials(
  email: string,
  password: string,
  ipHash: string,
  now: Date,
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
