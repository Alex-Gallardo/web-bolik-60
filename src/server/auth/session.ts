import "server-only";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { env } from "@/env";
import { ADMIN_COOKIE, ADMIN_SESSION_SECONDS, adminCookieOptions } from "@/lib/admin-access";
import type { Role } from "@/lib/constants";

/**
 * Sesión del admin (BD-114, ADR-08): `{ userId, role }` cifrado en la cookie `bolik_admin` con
 * SESSION_SECRET, 8 h (la cookie vence un minuto antes que el sello). Una cookie vencida, dañada o
 * de otra clave se lee como sesión vacía. Leerla hace dinámica la página (Cache Components): las
 * páginas del admin van dentro de un <Suspense> (layout del admin).
 */
export type AdminSessionData = { userId: number; role: Role };

function sessionOptions() {
  return {
    cookieName: ADMIN_COOKIE,
    password: env.SESSION_SECRET,
    ttl: ADMIN_SESSION_SECONDS,
    cookieOptions: adminCookieOptions(env.APP_ENV),
  };
}

async function ironSession() {
  return getIronSession<AdminSessionData>(await cookies(), sessionOptions());
}

/** La sesión vigente, o null (sin cookie, vencida o dañada). */
export async function getAdminSession(): Promise<AdminSessionData | null> {
  const session = await ironSession();
  return typeof session.userId === "number" && session.role
    ? { userId: session.userId, role: session.role }
    : null;
}

/** ¿El navegador mandó la cookie? Distingue «nunca entró» de «se le venció la sesión». */
export async function hasAdminCookie(): Promise<boolean> {
  return (await cookies()).has(ADMIN_COOKIE);
}

/** Abre la sesión (solo en una Server Action o un route handler: escribe la cookie). */
export async function createAdminSession(data: AdminSessionData): Promise<void> {
  const session = await ironSession();
  session.userId = data.userId;
  session.role = data.role;
  await session.save();
}

/** Cierra la sesión y borra la cookie. */
export async function destroyAdminSession(): Promise<void> {
  (await ironSession()).destroy();
}
