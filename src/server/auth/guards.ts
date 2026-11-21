import "server-only";
import type { Route } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { env } from "@/env";
import { ADMIN_HOME_PATH, ADMIN_PATH_HEADER, DENIED_PARAM, loginUrl } from "@/lib/admin-access";
import type { Role } from "@/lib/constants";
import { getActiveAdmin, type AdminUserView } from "@/server/data/admin-users";
import { getAdminSession, hasAdminCookie } from "./session";

/**
 * Guardias del admin (BD-114, ADR-08). `proxy.ts` solo mira que la cookie exista; aquí se valida
 * de verdad, en el servidor, al inicio de cada página y Server Action:
 * `await requireRole(...ADMIN_PERMISSIONS.products)`.
 * El usuario se lee de la base en cada petición: si lo desactivan, lo bloquean o le cambian el rol,
 * lo pierde al momento (la cookie dura 8 h). El rol que manda es el de la base, no el de la cookie.
 */
export type AdminCheck =
  | { ok: true; user: AdminUserView }
  | { ok: false; error: "unauthenticated" | "expired" | "forbidden" };

/** Revisa la sesión y el rol sin redirigir: lo usan las acciones que responden con un resultado. */
export async function checkRole(roles: readonly Role[]): Promise<AdminCheck> {
  if (env.DATA_SOURCE !== "db") return { ok: false, error: "unauthenticated" };
  const session = await getAdminSession();
  if (!session)
    return { ok: false, error: (await hasAdminCookie()) ? "expired" : "unauthenticated" };
  const user = await getActiveAdmin(session.userId);
  if (!user) return { ok: false, error: "expired" };
  if (!roles.includes(user.role)) return { ok: false, error: "forbidden" };
  return { ok: true, user };
}

/** La ruta pedida (la pone proxy.ts en `ADMIN_PATH_HEADER`) para volver a ella tras el login. */
async function currentPath(): Promise<string> {
  return (await headers()).get(ADMIN_PATH_HEADER) ?? ADMIN_HOME_PATH;
}

/**
 * Para páginas y acciones del admin: sin sesión (o vencida) manda al login con la ruta de vuelta;
 * sin permiso, al inicio del admin con el aviso. Devuelve el usuario.
 */
export async function requireRole(...roles: Role[]): Promise<AdminUserView> {
  const check = await checkRole(roles);
  if (check.ok) return check.user;
  if (check.error === "forbidden") redirect(`${ADMIN_HOME_PATH}?${DENIED_PARAM}=1` as Route);
  redirect(
    loginUrl(await currentPath(), check.error === "expired" ? "expired" : undefined) as Route,
  );
}

/** ¿Hay una sesión válida? (para /styleguide en producción). */
export async function hasAdminSession(): Promise<boolean> {
  if (env.DATA_SOURCE !== "db") return false;
  const session = await getAdminSession();
  return session ? (await getActiveAdmin(session.userId)) !== null : false;
}
