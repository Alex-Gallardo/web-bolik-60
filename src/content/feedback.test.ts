// @vitest-environment node
import { describe, expect, it } from "vitest";
import { feedback } from "./feedback";

/** Recorre feedback: cada texto (o lo que devuelve cada función) debe tener contenido. */
function collect(node: unknown, path: string, out: [string, unknown][]) {
  if (typeof node === "function") collect(node("X"), `${path}()`, out);
  else if (node && typeof node === "object")
    for (const [key, value] of Object.entries(node)) collect(value, `${path}.${key}`, out);
  else out.push([path, node]);
}

describe("feedback (prueba de humo, docs/13 §3)", () => {
  const entries: [string, unknown][] = [];
  collect(feedback, "feedback", entries);

  it("tiene mensajes", () => {
    expect(entries.length).toBeGreaterThan(20);
  });

  it.each(
    entries.filter(([path]) => /\.(title|body|description)$/.test(path.replace(/\(\)$/, ""))),
  )("%s no está vacío", (_path, value) => {
    expect(typeof value).toBe("string");
    expect(String(value).trim()).not.toBe("");
  });

  it("el código de referencia del error se muestra con su etiqueta", () => {
    expect(feedback.system.genericError.reference("4F9A1C2B")).toBe(
      "Código de referencia: 4F9A1C2B",
    );
  });
});
