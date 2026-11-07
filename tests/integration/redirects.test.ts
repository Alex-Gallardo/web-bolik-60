import { NextRequest } from "next/server";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { writeNotFoundHits, writeRedirectHits } from "@/server/data/seo-logs";
import { proxyDb } from "@/server/data/proxy-db";
import { listActiveRedirects } from "@/server/data/redirects";
import { createRedirectStore } from "@/server/seo/redirects";
import { db } from "@/server/db";

// Redirecciones y registro de 404 (BD-046) contra BolikDigital_Test. Las escrituras solo corren con
// DATA_SOURCE=db: se fuerza aquí (la suite usa la base de pruebas). Todo lo creado lleva el prefijo
// /it-bd046 y se borra al final.
vi.mock("@/env", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/env")>();
  return { env: { ...original.env, DATA_SOURCE: "db" } };
});

const PREFIX = "/it-bd046";

async function cleanup() {
  await db.redirect.deleteMany({ where: { fromPath: { startsWith: PREFIX } } });
  await db.notFoundLog.deleteMany({ where: { path: { startsWith: PREFIX } } });
}

beforeEach(cleanup);
afterAll(async () => {
  await cleanup();
  await db.$disconnect();
  await proxyDb().$disconnect();
});

describe("redirecciones de la base (BD-046)", () => {
  it("listActiveRedirects trae solo las activas", async () => {
    await db.redirect.createMany({
      data: [
        { fromPath: `${PREFIX}/activa`, toPath: "/contacto" },
        { fromPath: `${PREFIX}/inactiva`, toPath: "/contacto", active: false },
      ],
    });
    const mine = (await listActiveRedirects()).filter((r) => r.fromPath.startsWith(PREFIX));
    expect(mine).toEqual([{ fromPath: `${PREFIX}/activa`, toPath: "/contacto", statusCode: 301 }]);
  });

  it("el proxy responde 301 con una fila de Redirect y cuenta sus usos", async () => {
    await db.redirect.create({
      data: { fromPath: `${PREFIX}/Vieja/`, toPath: "/productos/boligrafos/bolik-ultra" },
    });
    const store = createRedirectStore({ load: listActiveRedirects });
    const target = await store.find(`${PREFIX}/vieja`);
    expect(target).toMatchObject({ to: "/productos/boligrafos/bolik-ultra", status: 301 });

    // El mismo camino que proxy.ts, con el store de la base.
    const { proxy } = await import("@/proxy");
    const seo = await import("@/server/seo/redirects");
    vi.spyOn(seo.redirectStore, "find").mockImplementation((p, s) => store.find(p, s));
    const response = await proxy(new NextRequest(`http://127.0.0.1:3000${PREFIX}/VIEJA`));
    expect(response.status).toBe(301);
    expect(new URL(response.headers.get("location")!).pathname).toBe(
      "/productos/boligrafos/bolik-ultra",
    );

    await writeRedirectHits([
      { key: target!.fromPath, count: 3, detail: null, lastAt: new Date("2026-11-07T12:00:00Z") },
    ]);
    const row = await db.redirect.findFirstOrThrow({ where: { fromPath: `${PREFIX}/Vieja/` } });
    expect(row.hits).toBe(3);
    expect(row.lastHitAt?.toISOString()).toBe("2026-11-07T12:00:00.000Z");
  });

  it("writeNotFoundHits crea la fila y suma en el siguiente lote", async () => {
    const path = `${PREFIX}/no-existe?a=1`;
    await writeNotFoundHits([
      { key: path, count: 2, detail: "https://google.com/", lastAt: new Date() },
    ]);
    await writeNotFoundHits([{ key: path, count: 1, detail: null, lastAt: new Date() }]);
    const row = await db.notFoundLog.findUniqueOrThrow({ where: { path } });
    expect(row.hits).toBe(3);
    expect(row.referer).toBe("https://google.com/"); // un lote sin referer no lo borra
  });

  it("recorta las rutas que pasan del largo de la columna", async () => {
    const long = `${PREFIX}/${"x".repeat(600)}`;
    await writeNotFoundHits([{ key: long, count: 1, detail: null, lastAt: new Date() }]);
    const rows = await db.notFoundLog.findMany({ where: { path: { startsWith: PREFIX } } });
    expect(rows[0]!.path).toHaveLength(450);
  });
});
