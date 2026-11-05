import "server-only";
import { env } from "@/env";
import { isStyleguideVisible } from "@/lib/styleguide-access";

/**
 * Acceso a /styleguide (BD-026): lo usa su layout para responder 404 en producción.
 *
 * La sesión de admin llega con BD-114: aquí se suma `await hasAdminSession()`. Leer la cookie hace
 * dinámica la vista (con Cache Components, dentro de un <Suspense>). Hasta entonces no hay sesión
 * posible y en producción siempre responde 404.
 */
export async function canViewStyleguide(): Promise<boolean> {
  return isStyleguideVisible(env.APP_ENV, false);
}
