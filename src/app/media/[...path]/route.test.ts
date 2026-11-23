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
const { parseRange } = await import("@/lib/http-range");

const get = (...segments: string[]) => getWith({}, ...segments);
const getWith = (headers: Record<string, string>, ...segments: string[]) =>
  GET(new Request(`http://127.0.0.1:3000/media/${segments.join("/")}`, { headers }), {
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
  await mkdir(path.join(dir.value, "video"), { recursive: true });
  await writeFile(path.join(dir.value, "video", "planta-demo.mp4"), "0123456789");
  await writeFile(path.join(dir.value, "products", "otro.mp4"), "mp4");
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

describe("GET /media/video/*.mp4 (BD-050)", () => {
  it("sirve el video completo y anuncia rangos", async () => {
    const response = await get("video", "planta-demo.mp4");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("video/mp4");
    expect(response.headers.get("accept-ranges")).toBe("bytes");
    expect(response.headers.get("content-length")).toBe("10");
    expect(await response.text()).toBe("0123456789");
  });

  it("responde 206 con el rango pedido", async () => {
    const response = await getWith({ range: "bytes=2-5" }, "video", "planta-demo.mp4");
    expect(response.status).toBe(206);
    expect(response.headers.get("content-range")).toBe("bytes 2-5/10");
    expect(response.headers.get("content-length")).toBe("4");
    expect(await response.text()).toBe("2345");
  });

  it("ignora un Range que no entiende y manda el video completo, con caché de un día", async () => {
    const response = await getWith({ range: "bytes=0-1,4-5" }, "video", "planta-demo.mp4");
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("0123456789");
    expect(response.headers.get("cache-control")).toBe("public, max-age=86400");
  });

  it("416 para un rango fuera del archivo", async () => {
    const response = await getWith({ range: "bytes=20-" }, "video", "planta-demo.mp4");
    expect(response.status).toBe(416);
    expect(response.headers.get("content-range")).toBe("bytes */10");
  });

  it("solo mp4 dentro de video/, en minúsculas", async () => {
    for (const segments of [
      ["products", "otro.mp4"],
      ["video", "Planta-demo.mp4"],
      ["video", "planta-demo.MP4"],
      ["video", "sub", "planta-demo.mp4"],
      ["video", "no-existe.mp4"],
      ["video", "..", "products", "otro.mp4"],
    ]) {
      expect((await get(...segments)).status, segments.join("/")).toBe(404);
    }
  });

  it("parseRange: formas de un solo rango", () => {
    expect(parseRange(null, 10)).toBeNull();
    expect(parseRange("bytes=0-", 10)).toEqual({ start: 0, end: 9 });
    expect(parseRange("bytes=3-100", 10)).toEqual({ start: 3, end: 9 });
    expect(parseRange("bytes=-4", 10)).toEqual({ start: 6, end: 9 });
    expect(parseRange("bytes=-40", 10)).toEqual({ start: 0, end: 9 });
    // Fuera del archivo: 416.
    for (const header of ["bytes=5-2", "bytes=10-"]) {
      expect(parseRange(header, 10), header).toBe("invalid");
    }
    expect(parseRange("bytes=0-", 0)).toBe("invalid");
    // Lo que no se entiende se ignora (RFC 9110): archivo completo.
    for (const header of ["bytes=-", "items=0-1", "bytes=0-1,3-4", "basura"]) {
      expect(parseRange(header, 10), header).toBeNull();
    }
  });
});
