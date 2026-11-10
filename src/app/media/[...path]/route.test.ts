// @vitest-environment node
import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

// /media/* sin IIS (BD-034): lee de MEDIA_DIR, solo los WebP generados y nunca fuera de la carpeta.
const dir = vi.hoisted(() => ({ value: "" }));
vi.mock("@/env", () => ({
  env: {
    get MEDIA_DIR() {
      return dir.value;
    },
  },
}));

const { GET } = await import("./route");

const get = (...segments: string[]) =>
  GET(new Request(`http://127.0.0.1:3000/media/${segments.join("/")}`), {
    params: Promise.resolve({ path: segments }),
  });

let outside: string;

beforeAll(async () => {
  dir.value = await mkdtemp(path.join(tmpdir(), "bolik-media-route-"));
  outside = await mkdtemp(path.join(tmpdir(), "bolik-media-fuera-"));
  await mkdir(path.join(dir.value, "products"), { recursive: true });
  await writeFile(path.join(dir.value, "products", "ultra-a1b2c3d4-640.webp"), "webp");
  await writeFile(path.join(dir.value, "products", "nota.txt"), "texto");
  await writeFile(path.join(dir.value, "products", "foto.webp"), "sin ancho");
  await writeFile(path.join(dir.value, "products", "foto-640.jpg"), "jpg");
  await writeFile(path.join(outside, "secreto-640.webp"), "fuera");
  // Enlace dentro de MEDIA_DIR hacia una carpeta de fuera ("junction": en Windows no pide permisos).
  await symlink(outside, path.join(dir.value, "enlace"), "junction");
});

afterAll(async () => {
  await rm(dir.value, { recursive: true, force: true });
  await rm(outside, { recursive: true, force: true });
});

describe("GET /media/* (BD-034)", () => {
  it("sirve la imagen con su tipo y caché de un año", async () => {
    const response = await get("products", "ultra-a1b2c3d4-640.webp");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/webp");
    expect(response.headers.get("content-length")).toBe("4");
    expect(response.headers.get("cache-control")).toBe("public, max-age=31536000, immutable");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(await response.text()).toBe("webp");
  });

  it("404 para lo que no generó el procesador, lo que no existe y lo que sale de la carpeta", async () => {
    for (const segments of [
      ["products", "nota.txt"],
      ["products", "foto.webp"], // sin el ancho
      ["products", "foto-640.jpg"], // solo WebP
      ["products", "ultra-a1b2c3d4-641.webp"], // ancho que no se genera
      ["products", "no-existe-640.webp"],
      ["Products", "ultra-a1b2c3d4-640.webp"], // solo minúsculas (Windows no distingue)
      ["products", "ULTRA-A1B2C3D4-640.WEBP"],
      ["..", "secreto-640.webp"],
      ["products", "..", "..", "secreto-640.webp"],
      ["products\\..\\..", "secreto-640.webp"],
      [".oculto-640.webp"],
      ["ultra-a1b2c3d4-640.webp"], // siempre dentro de una carpeta
      ["products"],
    ]) {
      expect((await get(...segments)).status, segments.join("/")).toBe(404);
    }
  });

  it("no sigue un enlace simbólico hacia fuera de MEDIA_DIR", async () => {
    expect((await get("enlace", "secreto-640.webp")).status).toBe(404);
  });
});
