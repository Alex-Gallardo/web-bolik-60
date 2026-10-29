import "server-only";
import { redirect } from "next/navigation";
import { getSession } from "./session";
import type { Role } from "@/lib/constants";

export class ForbiddenError extends Error {
  constructor() {
    super("No tienes permiso para esta acción");
  }
}

/**
 * Úsalo al inicio de CADA página y Server Action del admin (proxy.ts solo mira si existe la cookie).
 *   const user = await requireRole(["admin", "editor"]);
 * - Sin sesión o vencida → redirige a /admin/login?next=…
 * - Rol no permitido → lanza ForbiddenError (la acción responde con feedback amable).
 */
export async function requireRole(allowed: readonly Role[], nextPath = "/admin") {
  const session = await getSession();
  if (!session.userId || !session.role || !session.expiresAt || session.expiresAt < Date.now()) {
    session.destroy();
    redirect(`/admin/login?next=${encodeURIComponent(nextPath)}`);
  }
  if (!allowed.includes(session.role)) throw new ForbiddenError();
  return { id: session.userId, role: session.role, name: session.name ?? "" };
}

export const can = {
  editCatalog: ["admin", "editor"] as const,
  editStores: ["admin", "editor", "ventas"] as const,
  handleRequests: ["admin", "ventas"] as const,
  manageSystem: ["admin"] as const,
};
