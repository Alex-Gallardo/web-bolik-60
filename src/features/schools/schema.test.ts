import { describe, expect, it } from "vitest";
import { safeParse } from "zod/mini";
import { feedback } from "@/content/feedback";
import { schoolVisitErrors, schoolVisitSchema } from "./schema";

const errors = feedback.forms.errors;
const valid = {
  schoolName: "Colegio Mixto El Progreso",
  level: "primaria",
  students: "120",
  department: "quetzaltenango",
  municipality: "Quetzaltenango",
  name: "Ana López",
  phone: "5555 1234",
  email: "",
  preferredMonth: "febrero",
};

describe("solicitud de visita escolar (BD-076)", () => {
  it("acepta lo del formulario y lo deja listo para guardar", () => {
    expect(safeParse(schoolVisitSchema, valid).data).toEqual({
      ...valid,
      students: 120,
      phone: "55551234",
      email: undefined,
    });
  });

  it("alumnos y mes son opcionales", () => {
    const result = safeParse(schoolVisitSchema, { ...valid, students: "", preferredMonth: "" });
    expect(result.data).toMatchObject({ students: undefined, preferredMonth: undefined });
  });

  it("marca todos los obligatorios a la vez, con teléfono o correo en los dos campos", () => {
    expect(schoolVisitErrors({})).toEqual({
      schoolName: errors.required,
      level: errors.required,
      department: errors.required,
      municipality: errors.required,
      name: errors.required,
      phone: errors.phoneOrEmail,
      email: errors.phoneOrEmail,
    });
  });

  it("nivel, alumnos y mes fuera de la lista no pasan", () => {
    expect(
      schoolVisitErrors({ ...valid, level: "universidad", students: "0", preferredMonth: "x" }),
    ).toEqual({
      level: errors.required,
      students: errors.count(9999),
      preferredMonth: errors.required,
    });
  });
});
