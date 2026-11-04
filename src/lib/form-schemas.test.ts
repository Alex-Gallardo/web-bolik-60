// @vitest-environment node
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { feedback } from "@/content/feedback";
import {
  email,
  gtPhone,
  nit,
  optionalEmail,
  optionalGtPhone,
  optionalText,
  quantity,
  requiredText,
  requirePhoneOrEmail,
  withPhoneOrEmail,
} from "./form-schemas";

const errors = feedback.forms.errors;

/** Primer mensaje de error, o null si es válido. */
function messageOf(schema: z.ZodType, value: unknown) {
  const result = schema.safeParse(value);
  return result.success ? null : result.error.issues[0]!.message;
}

describe("esquemas compartidos de formularios", () => {
  it("texto obligatorio: vacío o solo espacios pide el dato", () => {
    expect(messageOf(requiredText(), "")).toBe(errors.required);
    expect(messageOf(requiredText(), "   ")).toBe(errors.required);
    expect(messageOf(requiredText(), undefined)).toBe(errors.required);
    expect(requiredText().parse("  Librería Ana  ")).toBe("Librería Ana");
  });

  it("texto opcional: vacío queda undefined", () => {
    expect(optionalText().parse("  ")).toBeUndefined();
    expect(optionalText().parse("Hola")).toBe("Hola");
  });

  it("teléfono de Guatemala: acepta formatos comunes y guarda 8 dígitos", () => {
    expect(gtPhone.parse("5555 1234")).toBe("55551234");
    expect(gtPhone.parse("+502 6628-2600")).toBe("66282600");
    expect(messageOf(gtPhone, "1234")).toBe(errors.phone);
    expect(messageOf(gtPhone, "")).toBe(errors.required);
    expect(optionalGtPhone.parse("")).toBeUndefined();
    expect(messageOf(optionalGtPhone, "123")).toBe(errors.phone);
  });

  it("correo", () => {
    expect(email.parse(" ana@example.com ")).toBe("ana@example.com");
    expect(messageOf(email, "ana@")).toBe(errors.email);
    expect(messageOf(email, "")).toBe(errors.required);
    expect(optionalEmail.parse("")).toBeUndefined();
    expect(messageOf(optionalEmail, "ana")).toBe(errors.email);
  });

  it("NIT o CF", () => {
    expect(nit.parse("cf")).toBe("CF");
    expect(nit.parse("1234567-8")).toBe("12345678");
    expect(nit.parse("123456k")).toBe("123456K");
    expect(messageOf(nit, "ABC")).toBe(errors.nit);
  });

  it("cantidad de 1 a 9,999", () => {
    expect(quantity.parse("12")).toBe(12);
    expect(messageOf(quantity, 0)).toBe(errors.qtyMin);
    expect(messageOf(quantity, 1.5)).toBe(errors.qtyMin);
    expect(messageOf(quantity, 10000)).toBe(errors.qtyMax);
    expect(messageOf(quantity, "abc")).toBe(errors.qtyMin);
  });

  it("teléfono o correo: al menos uno, con el mensaje en los dos campos", () => {
    const contact = z
      .object({ phone: optionalGtPhone, email: optionalEmail })
      .superRefine(requirePhoneOrEmail);
    const result = contact.safeParse({ phone: "", email: "" });
    expect(result.success).toBe(false);
    expect(result.error!.issues.map((i) => [i.path[0], i.message])).toEqual([
      ["phone", errors.phoneOrEmail],
      ["email", errors.phoneOrEmail],
    ]);
    expect(contact.safeParse({ phone: "", email: "ana@example.com" }).success).toBe(true);
  });

  it("todo mensaje sale en español: largo, tipo y cantidad mal escrita", () => {
    expect(messageOf(requiredText(5), "abcdefg")).toBe(errors.tooLong(5));
    expect(messageOf(optionalText(3), "abcd")).toBe(errors.tooLong(3));
    expect(messageOf(requiredText(), 42)).toBe(errors.required);
    expect(messageOf(quantity, "1e3")).toBe(errors.qtyMin);
    expect(messageOf(quantity, true)).toBe(errors.qtyMin);
    expect(errors.tooLong(2000)).toBe("Usa como máximo 2,000 caracteres");
  });

  it("withPhoneOrEmail no revienta con una entrada que no es objeto", () => {
    const form = withPhoneOrEmail(z.object({ phone: optionalGtPhone, email: optionalEmail }));
    expect(() => form.safeParse(null)).not.toThrow();
    expect(form.safeParse(null).success).toBe(false);
  });

  it("withPhoneOrEmail avisa aunque otros campos también tengan error", () => {
    const form = withPhoneOrEmail(
      z.object({ name: requiredText(), phone: optionalGtPhone, email: optionalEmail }),
    );
    const result = form.safeParse({ name: "", phone: "", email: "" });
    const messages = result.error!.issues.map((i) => i.message);
    expect(messages).toContain(errors.required);
    expect(messages.filter((m) => m === errors.phoneOrEmail)).toHaveLength(2);
  });
});
