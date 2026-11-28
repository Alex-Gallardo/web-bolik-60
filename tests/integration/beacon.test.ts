import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { parseSeedData } from "../../prisma/seed/data";
import { seedDatabase } from "../../prisma/seed/seed";
import { db } from "@/server/db";

// Clics salientes (BD-083, docs/12 §4) contra BolikDigital_Test: el aviso del navegador llega a
// /api/beacon y queda una fila en OutboundClick con su tienda, departamento y variante.
const MARK = "/prueba-bd-083";

vi.mock("@/env", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/env")>();
  return { env: { ...original.env, DATA_SOURCE: "db" } };
});

const { POST } = await import("@/app/api/beacon/route");

let ip = 0;
const beacon = (payload: Record<string, string> | string) =>
  POST(
    new Request("http://127.0.0.1:3100/api/beacon", {
      method: "POST",
      body: typeof payload === "string" ? payload : JSON.stringify(payload),
      headers: {
        "content-type": "application/json",
        "sec-fetch-site": "same-origin",
        "x-forwarded-for": `10.83.0.${++ip}`,
        "sec-ch-ua-mobile": "?1",
      },
    }),
  );

const rowsFor = (path: string) =>
  db.outboundClick.findMany({
    where: { path },
    include: { store: true, department: true, variant: true },
  });

const cleanup = () => db.outboundClick.deleteMany({ where: { path: { startsWith: MARK } } });

beforeAll(async () => {
  await seedDatabase(db, parseSeedData(), { profile: "dev" });
  await cleanup();
}, 180_000);

afterAll(async () => {
  await cleanup();
  await db.$disconnect();
});

describe("POST /api/beacon con la base (BD-083)", () => {
  it("un clic a Walmart crea una fila con su tienda y su variante", async () => {
    const path = `${MARK}/walmart`;
    const response = await beacon({ e: "retailer_click", p: path, r: "walmart", k: "PT00058" });
    expect(response.status).toBe(204);
    const rows = await rowsFor(path);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      kind: "retailer",
      target: "walmart",
      deviceType: "mobile",
      store: { slug: "walmart" },
      variant: { sku: "PT00058" },
      department: null,
    });
  });

  it("«Cómo llegar» guarda la tienda y el departamento", async () => {
    const path = `${MARK}/maps`;
    await beacon({
      e: "maps_click",
      p: path,
      s: "tulan-quetzaltenango",
      d: "quetzaltenango",
    });
    const [row] = await rowsFor(path);
    expect(row).toMatchObject({
      kind: "maps",
      target: "google_maps",
      store: { slug: "tulan-quetzaltenango" },
      department: { slug: "quetzaltenango" },
    });
  });

  it("una tienda, un departamento o un SKU que no existen: no se guarda (aviso inventado)", async () => {
    const path = `${MARK}/desconocida`;
    const invented: Record<string, string>[] = [
      { e: "retailer_click", p: path, r: "no-existe" },
      { e: "maps_click", p: path, s: "walmart", d: "no-existe" },
      { e: "retailer_click", p: path, r: "walmart", k: "PT99999" },
    ];
    for (const payload of invented) expect((await beacon(payload)).status).toBe(204);
    expect(await rowsFor(path)).toHaveLength(0);
  });

  it("WhatsApp guarda su contexto como target, sin tienda", async () => {
    const path = `${MARK}/whatsapp`;
    await beacon({ e: "whatsapp_open", p: path, c: "quote" });
    const [row] = await rowsFor(path);
    expect(row).toMatchObject({ kind: "whatsapp", target: "quote", storeId: null });
  });

  it("un cuerpo de más de 2 KB se rechaza y no crea fila", async () => {
    const path = `${MARK}/grande`;
    const big = JSON.stringify({
      e: "retailer_click",
      p: path,
      r: "walmart",
      x: "a".repeat(2_100),
    });
    expect((await beacon(big)).status).toBe(413);
    expect(await rowsFor(path)).toHaveLength(0);
  });
});
