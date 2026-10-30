import { z } from "zod";

/**
 * Esquema de las variables de entorno del SERVIDOR (docs/03 §9). Sin "server-only" a propósito:
 * se valida al arrancar desde next.config.ts (dev y build) y desde src/instrumentation.ts (servidor
 * standalone en staging y producción, que no vuelve a evaluar next.config.ts). En el código de la
 * app se importa `env` desde src/env.ts, nunca este archivo.
 */

/** Valor de ejemplo de .env.example: sirve en desarrollo, nunca en staging ni producción. */
export const SESSION_SECRET_PLACEHOLDER = "cambia-esto-por-32-caracteres-o-mas-aleatorios";

/** user=sa, User Id=sa, uid=sa, username=sa o user={sa} en una cadena de SQL Server. */
const SA_USER = /;\s*(user(\s*id)?|username|uid)\s*=\s*\{?\s*sa\s*\}?\s*(;|$)/i;

export const serverEnvSchema = z
  .object({
    // Sin valor por defecto: si faltara en el servidor, se apagarían las reglas de producción.
    APP_ENV: z.enum(["development", "staging", "production"]),
    NEXT_PUBLIC_SITE_URL: z
      .url({ protocol: /^https?$/ })
      .refine((url) => !url.endsWith("/"), "sin barra final (se usa en los canonical)"),
    DATABASE_URL: z.string().startsWith("sqlserver://"),
    SESSION_SECRET: z.string().min(32, "debe tener al menos 32 caracteres"),
    ERP_MODE: z.enum(["noop", "smartk66"]).default("noop"),
    ERP_BASE_URL: z.url().optional(),
    ERP_API_KEY: z.string().optional(),
    SMTP_MODE: z.enum(["file", "smtp"]).default("file"),
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(587),
    SMTP_USER: z.string().optional(),
    SMTP_PASSWORD: z.string().optional(),
    MAIL_FROM: z.string().default("Bolik <web@bolik66.com>"),
    MAIL_SALES_TO: z.email(),
    MAIL_SCHOOLS_TO: z.email().optional(),
    MAIL_DISTRIBUTORS_TO: z.email().optional(),
    MEDIA_DIR: z.string().min(1),
    MEDIA_PUBLIC_PATH: z.string().default("/media"),
    INDEXNOW_KEY: z
      .string()
      .regex(/^[a-f0-9]{8,128}$/i)
      .optional(),
    CSP_ENFORCE: z.enum(["true", "false"]).default("false"),
  })
  .superRefine((v, ctx) => {
    const fail = (path: string, message: string) =>
      ctx.addIssue({ code: "custom", path: [path], message });
    const deployed = v.APP_ENV !== "development";

    if (v.ERP_MODE === "smartk66" && (!v.ERP_BASE_URL || !v.ERP_API_KEY))
      fail("ERP_MODE", "smartk66 requiere ERP_BASE_URL y ERP_API_KEY");
    if (v.SMTP_MODE === "smtp" && (!v.SMTP_HOST || !v.SMTP_USER || !v.SMTP_PASSWORD))
      fail("SMTP_MODE", "smtp requiere SMTP_HOST, SMTP_USER y SMTP_PASSWORD");
    if (v.APP_ENV === "production" && v.SMTP_MODE !== "smtp")
      fail("SMTP_MODE", "en producción debe ser smtp");
    if (deployed && !v.NEXT_PUBLIC_SITE_URL.startsWith("https://"))
      fail("NEXT_PUBLIC_SITE_URL", "fuera de desarrollo debe usar https");
    if (deployed && v.SESSION_SECRET === SESSION_SECRET_PLACEHOLDER)
      fail("SESSION_SECRET", "usa un valor aleatorio propio (openssl rand -base64 32)");
    // La web usa un login propio con permisos solo sobre su BD (docs/05), nunca el administrador.
    if (deployed && SA_USER.test(v.DATABASE_URL))
      fail("DATABASE_URL", "no uses el usuario sa fuera de desarrollo");
  });

export type ServerEnv = z.infer<typeof serverEnvSchema>;

type Source = Record<string, string | undefined>;

/**
 * SKIP_ENV_VALIDATION=true omite la validación solo en CI y desarrollo: en staging y producción
 * se ignora, para que nunca se despliegue sin validar.
 */
export function shouldSkipEnvValidation(source: Source): boolean {
  const appEnv = source.APP_ENV?.trim();
  return source.SKIP_ENV_VALIDATION === "true" && appEnv !== "staging" && appEnv !== "production";
}

/**
 * Valida las variables y devuelve los valores tipados (con defaults). Los espacios alrededor se
 * recortan y una variable vacía (`CLAVE=` en .env) cuenta como no definida. Si algo falla, lanza un
 * error que nombra cada variable con su problema (nunca su valor).
 */
export function parseServerEnv(source: Source): ServerEnv {
  const input = Object.fromEntries(
    Object.keys(serverEnvSchema.shape).map((key) => [key, source[key]?.trim() || undefined]),
  );
  const result = serverEnvSchema.safeParse(input, { error: z.locales.es().localeError });
  if (result.success) return result.data;

  const lines = result.error.issues.map((issue) => {
    const key = String(issue.path[0] ?? "(general)");
    // Las reglas cruzadas (custom) también apuntan a variables sin valor: esas llevan su mensaje.
    const missing = issue.code !== "custom" && input[key] === undefined;
    return `  • ${key}: ${missing ? "falta" : issue.message}`;
  });
  throw new Error(
    `Variables de entorno inválidas:\n${lines.join("\n")}\n` +
      "Defínelas en .env.local (plantilla en .env.example).",
  );
}
