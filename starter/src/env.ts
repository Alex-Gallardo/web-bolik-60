import "server-only";
import { z } from "zod";

/**
 * Variables de entorno del SERVIDOR, validadas al arrancar. Única puerta de entrada a process.env
 * (regla de lint). Para el cliente usa src/env.public.ts (solo NEXT_PUBLIC_*).
 */
const schema = z
  .object({
    APP_ENV: z.enum(["development", "staging", "production"]).default("development"),
    NEXT_PUBLIC_SITE_URL: z.url(),
    DATABASE_URL: z.string().startsWith("sqlserver://"),
    SESSION_SECRET: z.string().min(32, "SESSION_SECRET debe tener al menos 32 caracteres"),
    ERP_MODE: z.enum(["noop", "smartk66"]).default("noop"),
    ERP_BASE_URL: z.url().optional().or(z.literal("")),
    ERP_API_KEY: z.string().optional(),
    SMTP_MODE: z.enum(["file", "smtp"]).default("file"),
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().int().default(587),
    SMTP_USER: z.string().optional(),
    SMTP_PASSWORD: z.string().optional(),
    MAIL_FROM: z.string().default("Bolik <web@bolik66.com>"),
    MAIL_SALES_TO: z.email(),
    MAIL_SCHOOLS_TO: z.email().optional().or(z.literal("")),
    MAIL_DISTRIBUTORS_TO: z.email().optional().or(z.literal("")),
    MEDIA_DIR: z.string().min(1),
    MEDIA_PUBLIC_PATH: z.string().default("/media"),
    INDEXNOW_KEY: z.string().regex(/^[a-f0-9]{8,128}$/i).optional().or(z.literal("")),
  })
  .superRefine((v, ctx) => {
    if (v.ERP_MODE === "smartk66" && (!v.ERP_BASE_URL || !v.ERP_API_KEY))
      ctx.addIssue({ code: "custom", message: "ERP_MODE=smartk66 requiere ERP_BASE_URL y ERP_API_KEY" });
    if (v.SMTP_MODE === "smtp" && (!v.SMTP_HOST || !v.SMTP_USER || !v.SMTP_PASSWORD))
      ctx.addIssue({ code: "custom", message: "SMTP_MODE=smtp requiere SMTP_HOST, SMTP_USER y SMTP_PASSWORD" });
    if (v.APP_ENV === "production" && v.SMTP_MODE !== "smtp")
      ctx.addIssue({ code: "custom", message: "En producción SMTP_MODE debe ser smtp" });
  });

const parsed = process.env.SKIP_ENV_VALIDATION === "true" ? null : schema.safeParse(process.env);

if (parsed && !parsed.success) {
  const lines = parsed.error.issues.map((i) => `  • ${i.path.join(".") || "(general)"}: ${i.message}`);
  throw new Error(`Variables de entorno inválidas:\n${lines.join("\n")}\nRevisa .env.example`);
}

export const env = (parsed?.data ?? process.env) as z.infer<typeof schema>;
