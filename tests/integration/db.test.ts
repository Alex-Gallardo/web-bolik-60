import { afterAll, describe, expect, it } from "vitest";
import { db } from "@/server/db";

// Conexión real con Prisma + adaptador de SQL Server contra BolikDigital_Test (BD-010). Usa el
// año 2097 para no tocar los contadores de otras pruebas (folio.test.ts usa 2098 y 2099).
const YEAR = 2097;
describe("base de datos", () => {
  afterAll(async () => {
    await db.folioSequence.deleteMany({ where: { year: YEAR } });
    await db.$disconnect();
  });

  it("se conecta a la base de pruebas, nunca a la de desarrollo", async () => {
    const [row] = await db.$queryRaw<{ name: string }[]>`SELECT DB_NAME() AS name`;
    expect(row?.name).toBe("BolikDigital_Test");
  });

  it("la migración inicial creó FolioSequence y se puede escribir y leer", async () => {
    await db.folioSequence.deleteMany({ where: { year: YEAR } });
    await db.folioSequence.create({ data: { prefix: "COT", year: YEAR } });
    const updated = await db.folioSequence.update({
      where: { prefix_year: { prefix: "COT", year: YEAR } },
      data: { lastValue: { increment: 1 } },
    });
    expect(updated.lastValue).toBe(1);
    expect(await db.folioSequence.count({ where: { year: YEAR } })).toBe(1);
  });
});
