import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { nextFolio } from "@/server/folio";
import { db } from "@/server/db";

// Folios consecutivos (BD-033) contra BolikDigital_Test. Usa años lejanos (2098, 2099) para no
// tocar los contadores reales de la base de pruebas, y los borra al final.
const YEARS = [2098, 2099];
const at = (iso: string) => new Date(iso);
// Mediodía en Guatemala (UTC-6): sin ambigüedad de zona horaria.
const IN_2098 = at("2098-06-15T18:00:00Z");
const IN_2099 = at("2099-06-15T18:00:00Z");

async function cleanup() {
  await db.folioSequence.deleteMany({ where: { year: { in: YEARS } } });
}

beforeEach(cleanup);
afterAll(async () => {
  await cleanup();
  await db.$disconnect();
});

describe("nextFolio (BD-033)", () => {
  it("20 envíos en paralelo dan 20 folios distintos y consecutivos", async () => {
    // Cada transacción retiene el bloqueo 100 ms después del MERGE, como lo hará la que crea la
    // cotización: las demás tienen que esperarla de verdad (sin eso casi no se solapan). El pool
    // de mssql abre hasta 10 conexiones: hasta 10 transacciones compiten a la vez.
    const HOLD_MS = 100;
    const started = Date.now();
    const folios = await Promise.all(
      Array.from({ length: 20 }, () =>
        db.$transaction(
          async (tx) => {
            const folio = await nextFolio(tx, "COT", IN_2098);
            await tx.$executeRaw`WAITFOR DELAY '00:00:00.100'`;
            return folio;
          },
          { maxWait: 30_000, timeout: 30_000 },
        ),
      ),
    );
    // El bloqueo las pone en fila: nunca dos a la vez entre el MERGE y el commit.
    expect(Date.now() - started).toBeGreaterThanOrEqual(20 * HOLD_MS);
    expect(new Set(folios).size).toBe(20);
    const numbers = folios.map((f) => Number(f.slice(-6))).sort((a, b) => a - b);
    expect(numbers).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
    expect(folios.every((f) => /^COT-2098-\d{6}$/.test(f))).toBe(true);
  });

  it("el 1 de enero (hora de Guatemala) reinicia el consecutivo", async () => {
    const next = (now: Date) => db.$transaction((tx) => nextFolio(tx, "COT", now));
    expect(await next(IN_2098)).toBe("COT-2098-000001");
    expect(await next(IN_2098)).toBe("COT-2098-000002");
    // 31 dic 2098 a las 23:59 en Guatemala: aunque en UTC ya sea 2099, sigue en 2098.
    expect(await next(at("2099-01-01T05:59:00Z"))).toBe("COT-2098-000003");
    // 1 ene 2099 a las 00:00 en Guatemala.
    expect(await next(at("2099-01-01T06:00:00Z"))).toBe("COT-2099-000001");
  });

  it("cada prefijo lleva su propio consecutivo", async () => {
    const next = (prefix: "COT" | "ESC" | "DIS") =>
      db.$transaction((tx) => nextFolio(tx, prefix, IN_2099));
    expect(await next("COT")).toBe("COT-2099-000001");
    expect(await next("ESC")).toBe("ESC-2099-000001");
    expect(await next("COT")).toBe("COT-2099-000002");
    expect(await next("DIS")).toBe("DIS-2099-000001");
  });

  it("si la solicitud falla, el número no se gasta (no quedan huecos)", async () => {
    await db.$transaction((tx) => nextFolio(tx, "ESC", IN_2098));
    await expect(
      db.$transaction(async (tx) => {
        await nextFolio(tx, "ESC", IN_2098);
        throw new Error("la solicitud no se pudo guardar");
      }),
    ).rejects.toThrow("no se pudo guardar");
    expect(await db.$transaction((tx) => nextFolio(tx, "ESC", IN_2098))).toBe("ESC-2098-000002");
  });

  it("al pasar de 999 999 lo rechaza y el contador no avanza", async () => {
    await db.folioSequence.create({ data: { prefix: "DIS", year: 2098, lastValue: 999_999 } });
    await expect(db.$transaction((tx) => nextFolio(tx, "DIS", IN_2098))).rejects.toThrow(
      "Se agotó el consecutivo",
    );
    const row = await db.folioSequence.findUniqueOrThrow({
      where: { prefix_year: { prefix: "DIS", year: 2098 } },
    });
    expect(row.lastValue).toBe(999_999);
  });

  it("rechaza un prefijo que no existe", async () => {
    await expect(db.$transaction((tx) => nextFolio(tx, "XYZ" as "COT", IN_2098))).rejects.toThrow(
      "Prefijo de folio inválido",
    );
  });
});
