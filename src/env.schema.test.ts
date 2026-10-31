// @vitest-environment node
import { describe, expect, it } from "vitest";
import { parseServerEnv, SESSION_SECRET_PLACEHOLDER, shouldSkipEnvValidation } from "./env.schema";

// Valores ficticios: nunca credenciales reales (el repo es público).
const base = {
  APP_ENV: "development",
  NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
  DATABASE_URL: "sqlserver://localhost:1433;database=BolikDigital_Test;user=dev;password=x",
  SESSION_SECRET: SESSION_SECRET_PLACEHOLDER,
  MAIL_SALES_TO: "ventas@bolik66.com",
  MEDIA_DIR: "./.media",
};

const production = {
  ...base,
  APP_ENV: "production",
  NEXT_PUBLIC_SITE_URL: "https://www.bolik66.com",
  DATABASE_URL: "sqlserver://db:1433;database=BolikDigital;user=bolik_app;password=x",
  SESSION_SECRET: "x".repeat(40),
  SMTP_MODE: "smtp",
  SMTP_HOST: "smtp.office365.com",
  SMTP_USER: "web@bolik66.com",
  SMTP_PASSWORD: "x",
};

/** Mensaje de error de parseServerEnv (o "" si es válido). */
function errorOf(source: Record<string, string | undefined>): string {
  try {
    parseServerEnv(source);
    return "";
  } catch (error) {
    return (error as Error).message;
  }
}

describe("parseServerEnv", () => {
  it("acepta un entorno de desarrollo mínimo y aplica valores por defecto", () => {
    const env = parseServerEnv(base);
    expect(env.ERP_MODE).toBe("noop");
    expect(env.SMTP_MODE).toBe("file");
    expect(env.SMTP_PORT).toBe(587);
    expect(env.CSP_ENFORCE).toBe("false");
  });

  it("acepta un entorno de producción completo", () => {
    expect(errorOf(production)).toBe("");
  });

  it("nombra cada variable que falta, sin mostrar valores", () => {
    const message = errorOf({ ...base, DATABASE_URL: undefined, APP_ENV: undefined });
    expect(message).toContain("• DATABASE_URL: falta");
    expect(message).toContain("• APP_ENV: falta");
    expect(message).not.toContain("password");
  });

  it("trata vacío y solo espacios como no definido", () => {
    expect(errorOf({ ...base, MEDIA_DIR: "" })).toContain("• MEDIA_DIR: falta");
    expect(errorOf({ ...base, SESSION_SECRET: " ".repeat(40) })).toContain(
      "• SESSION_SECRET: falta",
    );
  });

  it("valida formatos", () => {
    expect(errorOf({ ...base, DATABASE_URL: "mysql://x" })).toContain("DATABASE_URL");
    expect(errorOf({ ...base, MAIL_SALES_TO: "no-es-correo" })).toContain("MAIL_SALES_TO");
    expect(errorOf({ ...base, SMTP_PORT: "99999" })).toContain("SMTP_PORT");
    expect(errorOf({ ...base, NEXT_PUBLIC_SITE_URL: "http://localhost:3000/" })).toContain(
      "sin barra final",
    );
  });

  it("aplica las reglas cruzadas de ERP y SMTP", () => {
    expect(errorOf({ ...base, ERP_MODE: "smartk66" })).toContain("smartk66 requiere");
    expect(errorOf({ ...base, SMTP_MODE: "smtp" })).toContain("smtp requiere");
    expect(errorOf({ ...production, SMTP_MODE: "file" })).toContain("en producción debe ser smtp");
  });

  it("fuera de desarrollo exige https y un secreto propio", () => {
    expect(errorOf({ ...production, NEXT_PUBLIC_SITE_URL: "http://www.bolik66.com" })).toContain(
      "https",
    );
    expect(errorOf({ ...production, SESSION_SECRET: SESSION_SECRET_PLACEHOLDER })).toContain(
      "SESSION_SECRET",
    );
  });

  it.each(["user=sa;", "User Id=sa;", "uid=sa;", "username=sa;", "user={sa};", "user = SA ;"])(
    "fuera de desarrollo rechaza el usuario sa (%s)",
    (user) => {
      const url = `sqlserver://db:1433;database=BolikDigital;${user}password=x`;
      expect(errorOf({ ...production, DATABASE_URL: url })).toContain("no uses el usuario sa");
    },
  );

  it("no confunde otros usuarios con sa", () => {
    const url = "sqlserver://db:1433;database=BolikDigital;user=sa2;password=x";
    expect(errorOf({ ...production, DATABASE_URL: url })).toBe("");
  });

  it("permite el usuario sa en desarrollo", () => {
    expect(
      errorOf({ ...base, DATABASE_URL: "sqlserver://l:1433;database=d;user=sa;password=x" }),
    ).toBe("");
  });
});

describe("shouldSkipEnvValidation", () => {
  it("solo omite la validación en CI y desarrollo", () => {
    expect(shouldSkipEnvValidation({ SKIP_ENV_VALIDATION: "true" })).toBe(true);
    expect(shouldSkipEnvValidation({ SKIP_ENV_VALIDATION: "true", APP_ENV: "development" })).toBe(
      true,
    );
    expect(shouldSkipEnvValidation({ SKIP_ENV_VALIDATION: "true", APP_ENV: "staging" })).toBe(
      false,
    );
    expect(shouldSkipEnvValidation({ SKIP_ENV_VALIDATION: "true", APP_ENV: "production" })).toBe(
      false,
    );
    expect(shouldSkipEnvValidation({})).toBe(false);
  });
});
