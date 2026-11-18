import * as z from "zod/mini";
import { describe, expect, it } from "vitest";
import { feedback } from "@/content/feedback";
import { contactErrors, quoteContactSchema, quoteLinesSchema } from "./schema";

const errors = feedback.forms.errors;

const valid = {
  customerType: "libreria",
  organization: "  Librería El Estudiante ",
  name: "Ana López",
  phone: "5555 1234",
  email: "",
  department: "quetzaltenango",
  municipality: "",
  notes: "",
};

describe("esquema de la cotización (BD-072)", () => {
  it("acepta lo mínimo y normaliza: espacios, teléfono y vacíos a undefined", () => {
    const result = z.safeParse(quoteContactSchema, valid);
    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      customerType: "libreria",
      organization: "Librería El Estudiante",
      name: "Ana López",
      phone: "55551234",
      email: undefined,
      department: "quetzaltenango",
      municipality: undefined,
      notes: undefined,
    });
  });

  it("todo vacío: muestra todos los problemas a la vez, con los textos de doc 17", () => {
    expect(
      contactErrors({
        customerType: "",
        organization: "",
        name: "",
        phone: "",
        email: "",
        department: "",
      }),
    ).toEqual({
      customerType: errors.required,
      organization: errors.required,
      name: errors.required,
      phone: errors.phoneOrEmail,
      email: errors.phoneOrEmail,
      department: errors.required,
    });
  });

  it("«Otro» no pide institución; los demás tipos sí", () => {
    expect(contactErrors({ ...valid, customerType: "otro", organization: "" })).toEqual({});
    expect(contactErrors({ ...valid, customerType: "empresa", organization: " " })).toEqual({
      organization: errors.required,
    });
  });

  it("basta el correo; un teléfono o correo mal escrito tiene su propio aviso", () => {
    expect(contactErrors({ ...valid, phone: "", email: "ana@correo.com" })).toEqual({});
    expect(contactErrors({ ...valid, phone: "1234" })).toEqual({ phone: errors.phone });
    expect(contactErrors({ ...valid, email: "ana@" })).toEqual({ email: errors.email });
  });

  it("respeta los largos de la base y rechaza un departamento con otra forma", () => {
    expect(contactErrors({ ...valid, name: "a".repeat(121) })).toEqual({
      name: errors.tooLong(120),
    });
    expect(contactErrors({ ...valid, notes: "a".repeat(2001) })).toEqual({
      notes: errors.tooLong(2000),
    });
    expect(contactErrors({ ...valid, department: "Quetzaltenango; DROP" })).toEqual({
      department: errors.required,
    });
  });

  it("una petición mal formada recibe errores, no una excepción", () => {
    expect(z.safeParse(quoteContactSchema, null).success).toBe(false);
    expect(z.safeParse(quoteContactSchema, "texto").success).toBe(false);
  });

  it("líneas: de 1 a 50, cantidad entera de 1 a 9,999 y presentación conocida", () => {
    const line = { type: "variante", ref: "PT00058", packaging: "cajilla12", quantity: 20 };
    expect(z.safeParse(quoteLinesSchema, [line]).success).toBe(true);
    expect(z.safeParse(quoteLinesSchema, []).success).toBe(false);
    expect(z.safeParse(quoteLinesSchema, Array(51).fill(line)).success).toBe(false);
    expect(z.safeParse(quoteLinesSchema, [{ ...line, quantity: 10_000 }]).success).toBe(false);
    expect(z.safeParse(quoteLinesSchema, [{ ...line, quantity: 1.5 }]).success).toBe(false);
    expect(z.safeParse(quoteLinesSchema, [{ ...line, packaging: "caja-x" }]).success).toBe(false);
  });
});
