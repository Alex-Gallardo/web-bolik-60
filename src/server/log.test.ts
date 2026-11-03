// @vitest-environment node
import { Writable } from "node:stream";
import { describe, expect, it } from "vitest";
import { maskText } from "@/lib/redact";
import { createLogger, logError, newRequestId, pathWithoutQuery } from "./log";

/** Logger que escribe en memoria para leer las líneas JSON. */
function memoryLogger() {
  const lines: Record<string, unknown>[] = [];
  const destination = new Writable({
    write(chunk, _encoding, done) {
      lines.push(JSON.parse(String(chunk)));
      done();
    },
  });
  return { logger: createLogger({ destination }), lines };
}

describe("createLogger", () => {
  it("escribe JSON con nivel, hora ISO y nombre de la app", () => {
    const { logger, lines } = memoryLogger();
    logger.info({ ruta: "/" }, "hola");
    expect(lines[0]).toMatchObject({ level: 30, app: "bolik-digital", ruta: "/", msg: "hola" });
    expect(String(lines[0]?.time)).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("oculta datos personales y secretos, en la raíz y un nivel adentro", () => {
    const { logger, lines } = memoryLogger();
    logger.info({
      correo: "ana@example.com",
      password: "x",
      cliente: { nombre: "Ana", telefono: "55551234", tipo: "libreria" },
      headers: { cookie: "bolik_admin=abc" },
    });
    const line = JSON.stringify(lines[0]);
    for (const secret of ["ana@example.com", "Ana", "55551234", "bolik_admin=abc", '"x"'])
      expect(line).not.toContain(secret);
    expect(line).toContain("[oculto]");
    expect(line).toContain("libreria");
  });
});

describe("createLogger con datos de una cotización", () => {
  it("no deja pasar datos personales anidados, en arreglos ni en el error", () => {
    const { logger, lines } = memoryLogger();
    const err = Object.assign(new Error("Recipient rejected: ana@example.com"), {
      meta: { email: "ana@example.com" },
    });
    logger.error(
      {
        quote: {
          cliente: { contacto: { correo: "ana@example.com" } },
          items: [{ phone: "55551234" }],
        },
        err,
      },
      "fallo",
    );
    const line = JSON.stringify(lines[0]);
    expect(line).not.toContain("ana@example.com");
    expect(line).not.toContain("55551234");
    expect(line).toContain("Recipient rejected: [correo]");
  });
});

describe("logError", () => {
  it("registra el error con un código y lo devuelve para el visitante", () => {
    const { logger, lines } = memoryLogger();
    const id = logError(new Error("fallo SMTP"), { action: "submitQuote" }, logger);
    expect(id).toMatch(/^[0-9A-F]{8}$/);
    expect(lines[0]).toMatchObject({ level: 50, requestId: id, action: "submitQuote" });
    expect(JSON.stringify(lines[0])).toContain("fallo SMTP");
  });

  it("el código nunca se confunde con un teléfono ni se oculta del log", () => {
    // 8 dígitos seguidos coinciden con el filtro de teléfonos de redact().
    for (let i = 0; i < 5000; i++) {
      const id = newRequestId();
      expect(id).toMatch(/^[0-9A-F]{8}$/);
      expect(maskText(id)).toBe(id);
    }
  });

  it("el código sale intacto en la línea del log", () => {
    const { logger, lines } = memoryLogger();
    const ids = Array.from({ length: 500 }, () => logError(new Error("fallo"), {}, logger));
    expect(lines.map((line) => line.requestId)).toEqual(ids);
  });

  it("conserva en el log un digest de Next de 8 dígitos", () => {
    const { logger, lines } = memoryLogger();
    logger.error({ requestId: "12345678" }, "error en petición");
    expect(lines[0]?.requestId).toBe("12345678");
  });

  it("genera códigos distintos", () => {
    const ids = new Set(Array.from({ length: 100 }, newRequestId));
    expect(ids.size).toBe(100);
  });
});

describe("pathWithoutQuery", () => {
  it("quita la query string, que puede traer datos del visitante", () => {
    expect(pathWithoutQuery("/buscar?q=ana@example.com")).toBe("/buscar");
    expect(pathWithoutQuery("/productos")).toBe("/productos");
  });
});
