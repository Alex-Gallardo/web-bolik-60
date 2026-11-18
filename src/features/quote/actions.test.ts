import { describe, expect, it } from "vitest";
import { feedback } from "@/content/feedback";
import { submitQuote } from "./actions";

const contact = {
  customerType: "libreria",
  organization: "Librería El Estudiante",
  name: "Ana López",
  phone: "5555 1234",
  email: "",
  department: "quetzaltenango",
};
const lines = [{ type: "variante", ref: "PT00058", packaging: "cajilla12", quantity: 20 }];

describe("submitQuote (BD-072: validación en el servidor)", () => {
  it("rechaza un contacto inválido con el error de cada campo", async () => {
    expect(await submitQuote({ ...contact, name: "", phone: "" }, lines)).toEqual({
      ok: false,
      error: "invalid",
      fields: {
        name: feedback.forms.errors.required,
        phone: feedback.forms.errors.phoneOrEmail,
        email: feedback.forms.errors.phoneOrEmail,
      },
    });
  });

  it("rechaza lo que no es un objeto o líneas inválidas, sin lanzar", async () => {
    expect(await submitQuote(null, lines)).toMatchObject({ ok: false, error: "invalid" });
    expect(await submitQuote(contact, [])).toEqual({ ok: false, error: "invalid" });
    expect(await submitQuote(contact, [{ ...lines[0], quantity: 0 }])).toEqual({
      ok: false,
      error: "invalid",
    });
  });

  it("con todo válido responde que todavía no puede enviarla (el envío real es BD-073)", async () => {
    expect(await submitQuote(contact, lines)).toEqual({ ok: false, error: "unavailable" });
  });
});
