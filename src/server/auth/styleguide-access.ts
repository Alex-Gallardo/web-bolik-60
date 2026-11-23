import "server-only";
import { env } from "@/env";
import { isStyleguideVisible } from "@/lib/styleguide-access";
import { hasAdminSession } from "./guards";

/**
 * Acceso a /styleguide (BD-026, BD-114): en desarrollo y staging siempre (sin leer la cookie, así
 * la vista sigue estática); en producción solo con sesión de admin, y si no, 404. Leer la cookie
 * hace dinámica la vista: el layout del styleguide la llama dentro de un <Suspense>.
 */
export async function canViewStyleguide(): Promise<boolean> {
  if (isStyleguideVisible(env.APP_ENV, false)) return true;
  return isStyleguideVisible(env.APP_ENV, await hasAdminSession());
}
