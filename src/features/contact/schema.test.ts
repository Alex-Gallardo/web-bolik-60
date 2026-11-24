import { describe, expect, it } from "vitest";
import { safeParse } from "zod/mini";
import { feedback } from "@/content/feedback";
import { contactErrors, contactSchema } from "./schema";

const errors = feedback.forms.errors;
const valid = {
  subject: "productos",
  name: "Marta Gómez",
  phone: "",
  email: "marta@ejemplo.com",
  message: "¿Tienen lapiceros de tinta gel en color morado?",
};

describe("mensaje de contacto (BD-076)", () => {
  it("acepta lo del formulario", () => {
    expect(safeParse(contactSchema, valid).data).toEqual({ ...valid, phone: undefined });
  });

  it("marca todos los obligatorios a la vez", () => {
    expect(contactErrors({})).toEqual({
      subject: errors.required,
      name: errors.required,
      phone: errors.phoneOrEmail,
      email: errors.phoneOrEmail,
      message: errors.required,
    });
  });

  it("asunto fuera de la lista y mensaje demasiado largo no pasan", () => {
    expect(contactErrors({ ...valid, subject: "mayoreo", message: "a".repeat(3001) })).toEqual({
      subject: errors.required,
      message: errors.tooLong(3000),
    });
  });
});
