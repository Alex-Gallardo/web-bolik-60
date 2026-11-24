import { describe, expect, it } from "vitest";
import { object, safeParse } from "zod/mini";
import { feedback } from "@/content/feedback";
import {
  departmentSlug,
  fieldErrors,
  optionalChoice,
  optionalCount,
  optionalNit,
  requiredChoice,
  requiredText,
} from "./form-schemas-mini";

const errors = feedback.forms.errors;
const parse = (schema: Parameters<typeof safeParse>[0], value: unknown) => safeParse(schema, value);

describe("piezas de BD-076 en zod/mini", () => {
  it("NIT opcional: vacío, CF y dígitos con verificador; sin guion ni espacios", () => {
    expect(parse(optionalNit, "").data).toBeUndefined();
    expect(parse(optionalNit, undefined).data).toBeUndefined();
    expect(parse(optionalNit, " cf ").data).toBe("CF");
    expect(parse(optionalNit, "1234567-k").data).toBe("1234567K");
    expect(parse(optionalNit, "123 456 7").data).toBe("1234567");
    const bad = parse(optionalNit, "abc");
    expect(bad.success).toBe(false);
    expect(bad.error?.issues[0]?.message).toBe(errors.nit);
  });

  it("cantidad opcional de 1 al tope, solo dígitos (con separador de miles)", () => {
    const count = optionalCount(9999);
    expect(parse(count, "").data).toBeUndefined();
    expect(parse(count, " 120 ").data).toBe(120);
    expect(parse(count, "1,200").data).toBe(1200);
    for (const bad of ["0", "-5", "1e3", "10000", "doce", "12.5"]) {
      const result = parse(count, bad);
      expect(result.success, bad).toBe(false);
      expect(result.error?.issues[0]?.message).toBe(errors.count(9999));
    }
  });

  it("opciones: la obligatoria pide el dato; la opcional deja vacío como undefined", () => {
    const required = requiredChoice(["a", "b"] as const);
    expect(parse(required, "a").data).toBe("a");
    expect(parse(required, "").error?.issues[0]?.message).toBe(errors.required);
    expect(parse(required, "z").success).toBe(false);
    const optional = optionalChoice(["enero", "febrero"] as const);
    expect(parse(optional, "").data).toBeUndefined();
    expect(parse(optional, "febrero").data).toBe("febrero");
    expect(parse(optional, "marzo").success).toBe(false);
  });

  it("slug de departamento: minúsculas y guiones", () => {
    expect(parse(departmentSlug, "alta-verapaz").success).toBe(true);
    expect(parse(departmentSlug, "Alta Verapaz").success).toBe(false);
    expect(parse(departmentSlug, "").success).toBe(false);
  });

  it("fieldErrors: el primer error de cada campo; nada si es válido", () => {
    const schema = object({ name: requiredText(5), month: optionalChoice(["enero"] as const) });
    expect(fieldErrors(schema, { name: "Ana" })).toEqual({});
    expect(fieldErrors(schema, { name: "", month: "x" })).toEqual({
      name: errors.required,
      month: errors.required,
    });
    expect(fieldErrors(schema, { name: "Demasiado" })).toEqual({ name: errors.tooLong(5) });
  });
});
