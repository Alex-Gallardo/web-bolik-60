/** Entornos de despliegue (src/env.schema.ts, APP_ENV). */
export type AppEnv = "development" | "staging" | "production";

/**
 * ¿Se muestra /styleguide? (docs/14 BD-026). En desarrollo y staging, siempre: es la vitrina para
 * revisar cambios. En producción, solo con sesión de admin; sin ella responde 404.
 */
export function isStyleguideVisible(appEnv: AppEnv, hasAdminSession: boolean): boolean {
  return appEnv !== "production" || hasAdminSession;
}
