import { afterEach, describe, expect, it } from "vitest";
import { QUOTE_DRAFT_KEY, clearDraft, readDraft, sanitizeDraft, saveDraft } from "./draft";

afterEach(() => sessionStorage.clear());

describe("borrador del formulario de cotización (BD-072)", () => {
  it("guarda y lee los campos del formulario en sessionStorage", () => {
    saveDraft({ customerType: "empresa", name: "Ana", notes: "Para enero" });
    expect(readDraft()).toEqual({ customerType: "empresa", name: "Ana", notes: "Para enero" });
    clearDraft();
    expect(sessionStorage.getItem(QUOTE_DRAFT_KEY)).toBeNull();
  });

  it("sin nada escrito no guarda nada", () => {
    saveDraft({ name: "" });
    expect(sessionStorage.getItem(QUOTE_DRAFT_KEY)).toBeNull();
  });

  it("descarta lo que no es del formulario o no es texto, y recorta lo largo", () => {
    expect(
      sanitizeDraft({ name: "Ana", phone: 5555, lines: ["x"], notes: "a".repeat(3000) }),
    ).toEqual({ name: "Ana", notes: "a".repeat(2000) });
    expect(sanitizeDraft(null)).toEqual({});
  });

  it("un borrador dañado o un sessionStorage bloqueado no rompen el formulario", () => {
    sessionStorage.setItem(QUOTE_DRAFT_KEY, "{no es json");
    expect(readDraft()).toEqual({});
    const blocked = () => {
      throw new Error("bloqueado");
    };
    expect(readDraft(blocked)).toEqual({});
    expect(() => saveDraft({ name: "Ana" }, blocked)).not.toThrow();
    expect(() => clearDraft(blocked)).not.toThrow();
  });
});
