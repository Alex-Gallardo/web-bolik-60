import { describe, expect, it } from "vitest";
import { parseServerEnv } from "@/env.schema";

// Prueba de humo del proyecto de integración: corre en Node y resuelve los alias de tsconfig.
// Las pruebas con BD llegan con BD-010 (Prisma) y BD-073 (cotización).
describe("integración", () => {
  it("corre en Node con los alias de @/", () => {
    expect(typeof window).toBe("undefined");
    expect(typeof parseServerEnv).toBe("function");
  });
});
