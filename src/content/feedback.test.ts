// @vitest-environment node
import { describe, expect, it } from "vitest";
import { feedback } from "./feedback";

/**
 * Recorre feedback: cada texto (o lo que devuelve cada función) debe tener contenido. Cada
 * función recibe un argumento por parámetro, así un parámetro sin usar o mal ordenado se nota.
 */
function collect(node: unknown, path: string, out: [string, unknown][]) {
  if (typeof node === "function") {
    const args = Array.from({ length: node.length }, (_, i) => `ARG${i + 1}`);
    collect(node(...args), `${path}()`, out);
  } else if (node && typeof node === "object")
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

  it("ningún texto queda con 'undefined' ni 'null'", () => {
    for (const [path, value] of entries)
      if (typeof value === "string") expect(value, path).not.toMatch(/undefined|null/);
  });

  it("el código de referencia del error se muestra con su etiqueta", () => {
    expect(feedback.system.genericError.reference("4F9A1C2B")).toBe(
      "Código de referencia: 4F9A1C2B",
    );
  });
});
