// @vitest-environment node
import { describe, expect, it } from "vitest";
import { parseServerEnv, SESSION_SECRET_PLACEHOLDER, shouldSkipEnvValidation } from "./env.schema";

// Valores ficticios y genéricos: nunca credenciales ni nombres de la infraestructura real.
const base = {
  APP_ENV: "development",
  NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
  DATABASE_URL: "sqlserver://localhost:1433;database=app_test;user=dev;password=x",
  SESSION_SECRET: SESSION_SECRET_PLACEHOLDER,
  MAIL_SALES_TO: "ventas@example.com",
  MEDIA_DIR: "./.media",
};

/** Entorno desplegado válido (staging o producción). */
const deployed = (appEnv: "staging" | "production") => ({
  ...base,
  APP_ENV: appEnv,
  NEXT_PUBLIC_SITE_URL: "https://www.example.com",
  DATABASE_URL: "sqlserver://db:1433;database=app;user=app_user;password=x",
  SESSION_SECRET: "x".repeat(40),
  SMTP_MODE: "smtp",
  SMTP_HOST: "smtp.example.com",
  SMTP_USER: "web@example.com",
  SMTP_PASSWORD: "x",
});
const production = deployed("production");

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

  it("acepta entornos desplegados completos", () => {
    expect(errorOf(production)).toBe("");
    expect(errorOf(deployed("staging"))).toBe("");
  });

  it("nombra cada variable que falta", () => {
    const message = errorOf({ ...base, DATABASE_URL: undefined, APP_ENV: undefined });
    expect(message).toContain("• DATABASE_URL: falta");
    expect(message).toContain("• APP_ENV: falta");
  });

  it("nunca muestra el valor de una variable inválida", () => {
    const message = errorOf({ ...base, DATABASE_URL: "mysql://u:SECRETO123@h" });
    expect(message).toContain("DATABASE_URL");
    expect(message).not.toContain("SECRETO123");
  });

  it("trata vacío y solo espacios como no definido, y recorta los valores", () => {
    expect(errorOf({ ...base, MEDIA_DIR: "" })).toContain("• MEDIA_DIR: falta");
    expect(errorOf({ ...base, SESSION_SECRET: " ".repeat(40) })).toContain(
      "• SESSION_SECRET: falta",
    );
    expect(parseServerEnv({ ...base, APP_ENV: " development " }).APP_ENV).toBe("development");
  });

  it.each([
    ["APP_ENV", "local"],
    ["NEXT_PUBLIC_SITE_URL", "ftp://example.com"],
    ["NEXT_PUBLIC_SITE_URL", "http://localhost:3000/"],
    ["DATABASE_URL", "mysql://x"],
    ["SESSION_SECRET", "corto"],
    ["MAIL_SALES_TO", "no-es-correo"],
    ["SMTP_PORT", "99999"],
    ["ERP_BASE_URL", "no-es-url"],
    ["INDEXNOW_KEY", "no-hex!"],
  ])("rechaza %s con formato inválido (%s)", (key, value) => {
    expect(errorOf({ ...base, [key]: value })).toContain(`• ${key}:`);
  });

  it("aplica las reglas cruzadas del ERP", () => {
    const erp = {
      ERP_MODE: "smartk66",
      ERP_BASE_URL: "https://erp.example.com/api",
      ERP_API_KEY: "k",
    };
    expect(errorOf({ ...base, ...erp })).toBe("");
    expect(errorOf({ ...base, ...erp, ERP_API_KEY: undefined })).toContain("smartk66 requiere");
    expect(errorOf({ ...base, ...erp, ERP_BASE_URL: undefined })).toContain("smartk66 requiere");
  });

  it("aplica las reglas cruzadas del correo", () => {
    expect(errorOf({ ...base, SMTP_MODE: "smtp" })).toContain("smtp requiere");
    expect(errorOf({ ...production, SMTP_MODE: "file" })).toContain("en producción debe ser smtp");
    expect(errorOf({ ...deployed("staging"), SMTP_MODE: "file" })).toBe("");
  });

  describe.each(["staging", "production"] as const)("fuera de desarrollo (%s)", (appEnv) => {
    const env = deployed(appEnv);

    it("exige https", () => {
      expect(errorOf({ ...env, NEXT_PUBLIC_SITE_URL: "http://www.example.com" })).toContain(
        "fuera de desarrollo debe usar https",
      );
    });

    it("rechaza el secreto de ejemplo", () => {
      expect(errorOf({ ...env, SESSION_SECRET: SESSION_SECRET_PLACEHOLDER })).toContain(
        "usa un valor aleatorio propio",
      );
    });

    it.each([
      ";user=sa;password=x",
      ";User Id=sa;password=x",
      ";uid=sa;password=x",
      ";username=sa;password=x",
      ";user={sa};password=x",
      ";user = SA ;password=x",
      ";password=x;user=sa",
    ])("rechaza el usuario sa (%s)", (credentials) => {
      const url = `sqlserver://db:1433;database=app${credentials}`;
      expect(errorOf({ ...env, DATABASE_URL: url })).toContain("no uses el usuario sa");
    });

    it("no confunde otros usuarios con sa", () => {
      const url = "sqlserver://db:1433;database=app;user=sa2;password=x";
      expect(errorOf({ ...env, DATABASE_URL: url })).toBe("");
    });
  });

  it("en desarrollo permite http, el secreto de ejemplo y el usuario sa", () => {
    const url = "sqlserver://l:1433;database=d;user=sa;password=x";
    expect(errorOf({ ...base, DATABASE_URL: url })).toBe("");
  });
});

describe("shouldSkipEnvValidation", () => {
  it("solo omite la validación en CI y desarrollo", () => {
    const skip = (appEnv?: string) =>
      shouldSkipEnvValidation({ SKIP_ENV_VALIDATION: "true", APP_ENV: appEnv });
    expect(skip()).toBe(true);
    expect(skip("development")).toBe(true);
    expect(skip("staging")).toBe(false);
    expect(skip("production")).toBe(false);
    expect(skip(" production ")).toBe(false);
    expect(shouldSkipEnvValidation({})).toBe(false);
  });
});
