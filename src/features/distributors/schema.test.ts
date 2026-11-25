import { describe, expect, it } from "vitest";
import { safeParse } from "zod/mini";
import { feedback } from "@/content/feedback";
import { distributorErrors, distributorSchema } from "./schema";

const errors = feedback.forms.errors;
const valid = {
  businessName: "Librería La Esquina",
  businessType: "libreria",
  nit: "1234567-k",
  department: "guatemala",
  municipality: "Mixco",
  name: "Luis Pérez",
  phone: "",
  email: "luis@ejemplo.com",
};

describe("solicitud de distribuidor (BD-076)", () => {
  it("acepta lo del formulario; el NIT sin guion y en mayúscula", () => {
    expect(safeParse(distributorSchema, valid).data).toEqual({
      ...valid,
      nit: "1234567K",
      phone: undefined,
    });
  });

  it("el NIT es opcional", () => {
    expect(safeParse(distributorSchema, { ...valid, nit: "" }).data?.nit).toBeUndefined();
  });

  it("marca todos los obligatorios a la vez", () => {
    expect(distributorErrors({})).toEqual({
      businessName: errors.required,
      businessType: errors.required,
      department: errors.required,
      municipality: errors.required,
      name: errors.required,
      phone: errors.phoneOrEmail,
      email: errors.phoneOrEmail,
    });
  });

  it("tipo fuera de la lista y NIT inválido no pasan", () => {
    expect(distributorErrors({ ...valid, businessType: "supermercado", nit: "12-AB" })).toEqual({
      businessType: errors.required,
      nit: errors.nit,
    });
  });
});
