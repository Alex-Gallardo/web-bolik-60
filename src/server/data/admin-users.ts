import "server-only";
import { LOGIN_LOCK_MINUTES, LOGIN_MAX_ATTEMPTS } from "@/lib/admin-access";
import { ROLES, type Role } from "@/lib/constants";

/**
 * Usuarios del admin (BD-114, ADR-08). Solo con DATA_SOURCE=db: con la fuente de ejemplo no hay
 * usuarios y el login responde que el panel no está disponible. Sin caché: cada página del admin
 * revisa el usuario en la base (activo, sin bloqueo, su rol actual). La conexión se abre al usarla:
 * importar este módulo (lo hace el styleguide) no la necesita.
 */
const prisma = async () => (await import("@/server/db")).db;

/** Un rol guardado que no es de ROLES (editado a mano) no da acceso. */
const toRole = (value: string): Role | null =>
  (ROLES as readonly string[]).includes(value) ? (value as Role) : null;

export type AdminUserView = { id: number; name: string; email: string; role: Role };

export type LoginCandidate = AdminUserView & {
  passwordHash: string;
  active: boolean;
  lockedUntil: Date | null;
};

/** El usuario por su correo (en minúsculas), con lo que necesita el login. */
export async function findAdminForLogin(email: string): Promise<LoginCandidate | null> {
  const user = await (
    await prisma()
  ).adminUser.findUnique({
    where: { email: email.trim().toLowerCase() },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      passwordHash: true,
      active: true,
      lockedUntil: true,
    },
  });
  const role = user ? toRole(user.role) : null;
  return user && role ? { ...user, role } : null;
}

/** El usuario de una sesión si todavía puede entrar: activo, sin bloqueo y con un rol válido. */
export async function getActiveAdmin(id: number, now = new Date()): Promise<AdminUserView | null> {
  const user = await (
    await prisma()
  ).adminUser.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, role: true, active: true, lockedUntil: true },
  });
  if (!user || !user.active || (user.lockedUntil && user.lockedUntil > now)) return null;
  const role = toRole(user.role);
  return role ? { id: user.id, name: user.name, email: user.email, role } : null;
}

/** Sin bloqueo vigente en este momento: la condición va en la misma escritura (sin carreras). */
const unlocked = (now: Date) => ({ OR: [{ lockedUntil: null }, { lockedUntil: { lte: now } }] });

/**
 * Un intento fallido (BD-114). La condición «no bloqueada» va en la misma escritura que el
 * incremento: en una ráfaga de intentos a la vez, los que llegan después del bloqueo no cuentan ni
 * lo levantan. Al quinto bloquea la cuenta 15 minutos, reinicia el contador y lo registra en la
 * auditoría (una sola vez aunque dos intentos lleguen al quinto a la vez).
 */
export async function recordLoginFailure(
  id: number,
  ipHash: string,
  now = new Date(),
): Promise<{ locked: boolean }> {
  const db = await prisma();
  const counted = await db.adminUser.updateMany({
    where: { id, ...unlocked(now) },
    data: { failedLogins: { increment: 1 } },
  });
  if (counted.count === 0) return { locked: true };
  const user = await db.adminUser.findUniqueOrThrow({
    where: { id },
    select: { failedLogins: true },
  });
  if (user.failedLogins < LOGIN_MAX_ATTEMPTS) return { locked: false };
  const lockedUntil = new Date(now.getTime() + LOGIN_LOCK_MINUTES * 60_000);
  const locked = await db.adminUser.updateMany({
    where: { id, ...unlocked(now) },
    data: { failedLogins: 0, lockedUntil },
  });
  if (locked.count === 1)
    await db.auditLog.create({
      data: {
        userId: id,
        action: "lock",
        entity: "AdminUser",
        entityId: String(id),
        diff: JSON.stringify({ lockedUntil: lockedUntil.toISOString() }),
        ipHash,
      },
    });
  return { locked: true };
}

/**
 * Acceso correcto: reinicia el contador, guarda la fecha y lo registra en la auditoría. Solo si la
 * cuenta no quedó bloqueada mientras se comparaba la contraseña (otro intento de la misma ráfaga):
 * entonces responde `false` y no entra.
 */
export async function recordLoginSuccess(
  id: number,
  ipHash: string,
  now = new Date(),
): Promise<boolean> {
  const db = await prisma();
  const { count } = await db.adminUser.updateMany({
    where: { id, ...unlocked(now) },
    data: { failedLogins: 0, lockedUntil: null, lastLoginAt: now },
  });
  if (count === 0) return false;
  await db.auditLog.create({
    data: { userId: id, action: "login", entity: "AdminUser", entityId: String(id), ipHash },
  });
  return true;
}
