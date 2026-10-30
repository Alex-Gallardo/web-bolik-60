import { z } from "zod";

/**
 * Esquema de las variables de entorno del SERVIDOR (docs/03 §9). Sin "server-only" a propósito:
 * next.config.ts lo usa para validar al arrancar `dev`, `build` y `start`. En el código de la app
 * se importa `env` desde src/env.ts, nunca este archivo.
 */

/** Valor de ejemplo de .env.example: sirve en desarrollo, nunca en staging ni producción. */
export const SESSION_SECRET_PLACEHOLDER = "cambia-esto-por-32-caracteres-o-mas-aleatorios";

export const serverEnvSchema = z
  .object({
    APP_ENV: z.enum(["development", "staging", "production"]).default("development"),
    NEXT_PUBLIC_SITE_URL: z.url(),
    DATABASE_URL: z.string().startsWith("sqlserver://"),
    SESSION_SECRET: z.string().min(32, "debe tener al menos 32 caracteres"),
    ERP_MODE: z.enum(["noop", "smartk66"]).default("noop"),
    ERP_BASE_URL: z.url().optional(),
    ERP_API_KEY: z.string().optional(),
    SMTP_MODE: z.enum(["file", "smtp"]).default("file"),
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().int().default(587),
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

    if (v.ERP_MODE === "smartk66" && (!v.ERP_BASE_URL || !v.ERP_API_KEY))
      fail("ERP_MODE", "smartk66 requiere ERP_BASE_URL y ERP_API_KEY");
    if (v.SMTP_MODE === "smtp" && (!v.SMTP_HOST || !v.SMTP_USER || !v.SMTP_PASSWORD))
      fail("SMTP_MODE", "smtp requiere SMTP_HOST, SMTP_USER y SMTP_PASSWORD");
    if (v.APP_ENV === "production" && v.SMTP_MODE !== "smtp")
      fail("SMTP_MODE", "en producción debe ser smtp");
    if (v.APP_ENV !== "development" && v.SESSION_SECRET === SESSION_SECRET_PLACEHOLDER)
      fail("SESSION_SECRET", "usa un valor aleatorio propio (openssl rand -base64 32)");
    // La web usa un login propio con permisos solo sobre su BD (docs/05), nunca el administrador.
    if (v.APP_ENV !== "development" && /;\s*user(\s*id)?\s*=\s*sa\s*(;|$)/i.test(v.DATABASE_URL))
      fail("DATABASE_URL", "no uses el usuario sa fuera de desarrollo");
  });

export type ServerEnv = z.infer<typeof serverEnvSchema>;

type Source = Record<string, string | undefined>;

/**
 * Valida las variables y devuelve los valores tipados (con defaults). Las variables vacías
 * (`CLAVE=` en .env) cuentan como no definidas. Si algo falla, lanza un error que nombra
 * cada variable con su problema.
 */
export function parseServerEnv(source: Source): ServerEnv {
  const input = Object.fromEntries(
    Object.keys(serverEnvSchema.shape).map((key) => [key, source[key] || undefined]),
  );
  const result = serverEnvSchema.safeParse(input, { error: z.locales.es().localeError });
  if (result.success) return result.data;

  const lines = result.error.issues.map((issue) => {
    const key = String(issue.path[0] ?? "(general)");
    const missing = issue.code === "invalid_type" && input[key] === undefined;
    const message = missing ? "falta" : issue.message;
    return `  • ${key}: ${message}`;
  });
  throw new Error(
    `Variables de entorno inválidas:\n${lines.join("\n")}\n` +
      "Defínelas en .env.local (plantilla en .env.example).",
  );
}
