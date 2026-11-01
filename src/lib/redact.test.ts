// @vitest-environment node
import { describe, expect, it } from "vitest";
import { CENSOR, isSensitiveKey, maskText, redact } from "./redact";

describe("isSensitiveKey", () => {
  it.each([
    "email",
    "Email",
    "customerEmail",
    "e-mail",
    "correo",
    "phone",
    "phoneNumber",
    "telefono",
    "teléfono",
    "whatsapp",
    "password",
    "contrasena",
    "token",
    "SESSION_SECRET",
    "cookie",
    "authorization",
    "nit",
    "nombre",
    "nombreCompleto",
    "name",
    "fullName",
    "customer_name",
    "direccion",
    "address",
  ])("oculta %s", (key) => {
    expect(isSensitiveKey(key)).toBe(true);
  });

  it.each(["pathname", "routePath", "typeName", "folio", "sku", "requestId", "tipo", "cantidad"])(
    "no oculta %s",
    (key) => {
      expect(isSensitiveKey(key)).toBe(false);
    },
  );
});

describe("maskText", () => {
  it("enmascara correos y teléfonos de Guatemala dentro de un texto", () => {
    expect(maskText("Recipient rejected: ana.lopez@example.com")).toBe(
      "Recipient rejected: [correo]",
    );
    expect(maskText("Llamar al 5555-1234 o al +502 6628 2600")).toBe(
      "Llamar al [teléfono] o al [teléfono]",
    );
  });

  it("no toca folios, códigos de barras, fechas ni códigos de referencia", () => {
    const text = "COT-2026-000123 · 759364663092 · 2026-11-01T16:22:49Z · 2696662010 · PT00058";
    expect(maskText(text)).toBe(text);
  });
});

describe("redact", () => {
  it("oculta claves sensibles a cualquier profundidad y dentro de arreglos", () => {
    const out = redact({
      cotizacion: {
        cliente: { contacto: { correo: "ana@example.com", tipo: "libreria" } },
        items: [{ sku: "PT00058", qty: 12, customerEmail: "b@example.com" }],
      },
      headers: { Cookie: "bolik_admin=abc" },
    });
    const json = JSON.stringify(out);
    for (const secret of ["ana@example.com", "b@example.com", "bolik_admin=abc"])
      expect(json).not.toContain(secret);
    expect(json).toContain("libreria");
    expect(json).toContain("PT00058");
    expect(json).toContain(CENSOR);
  });

  it("limpia errores: mensaje, stack, propiedades propias y meta", () => {
    const error = Object.assign(new Error("Invalid value 'ana@example.com' for field correo"), {
      meta: { target: "Quote", email: "ana@example.com" },
      code: "P2002",
    });
    const out = redact({ err: error }) as { err: Record<string, unknown> };
    expect(out.err.type).toBe("Error");
    expect(out.err.code).toBe("P2002");
    expect(out.err.message).toBe("Invalid value '[correo]' for field correo");
    expect(JSON.stringify(out)).not.toContain("ana@example.com");
    expect(String(out.err.stack)).toContain("Invalid value '[correo]'");
  });

  it("conserva la causa del error, también limpia", () => {
    const error = new Error("fallo al enviar", { cause: new Error("SMTP 550 ana@example.com") });
    const out = redact(error) as { cause: { message: string } };
    expect(out.cause.message).toBe("SMTP 550 [correo]");
  });

  it("deja igual números, booleanos y null, y corta estructuras muy profundas", () => {
    expect(redact({ n: 1, ok: true, nada: null })).toEqual({ n: 1, ok: true, nada: null });
    let deep: Record<string, unknown> = { fin: 1 };
    for (let i = 0; i < 12; i++) deep = { nivel: deep };
    expect(JSON.stringify(redact(deep))).toContain("[…]");
  });
});
