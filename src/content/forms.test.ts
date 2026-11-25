import { describe, expect, it } from "vitest";
import {
  CONTACT_SUBJECTS,
  DISTRIBUTOR_BUSINESS_TYPES,
  MONTHS,
  SCHOOL_LEVELS,
} from "@/lib/constants";
import {
  businessTypeOptions,
  contactSubjectOptions,
  monthOptions,
  schoolLevelOptions,
} from "./forms";

// Cada valor que acepta la base tiene su opción en el formulario (BD-076): si se agrega uno a las
// constantes y no aquí, el formulario no lo mostraría.
describe("opciones de los formularios (BD-076)", () => {
  it.each([
    ["nivel", schoolLevelOptions, SCHOOL_LEVELS],
    ["mes", monthOptions, MONTHS],
    ["tipo de negocio", businessTypeOptions, DISTRIBUTOR_BUSINESS_TYPES],
    ["asunto", contactSubjectOptions, CONTACT_SUBJECTS],
  ] as const)("%s: las mismas, en el mismo orden", (_name, options, values) => {
    expect(options.map((o) => o.value)).toEqual([...values]);
  });
});
