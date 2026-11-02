import { afterAll, describe, expect, it } from "vitest";
import { db } from "@/server/db";

// Conexión real con Prisma + adaptador de SQL Server contra BolikDigital_Test (BD-010).
describe("base de datos", () => {
  afterAll(async () => {
    await db.folioSequence.deleteMany();
    await db.$disconnect();
  });

  it("se conecta a la base de pruebas, nunca a la de desarrollo", async () => {
    const [row] = await db.$queryRaw<{ name: string }[]>`SELECT DB_NAME() AS name`;
    expect(row?.name).toBe("BolikDigital_Test");
  });

  it("la migración inicial creó FolioSequence y se puede escribir y leer", async () => {
    await db.folioSequence.create({ data: { prefix: "COT", year: 2027 } });
    const updated = await db.folioSequence.update({
      where: { prefix_year: { prefix: "COT", year: 2027 } },
      data: { lastValue: { increment: 1 } },
    });
    expect(updated.lastValue).toBe(1);
    expect(await db.folioSequence.count()).toBe(1);
  });
});
