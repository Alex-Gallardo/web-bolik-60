// @vitest-environment node
import { mkdtemp, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { MEDIA_WIDTHS } from "@/lib/image-loader";
import media from "../../../prisma/seed/media.json";
import { ensureSampleMedia, SAMPLE_WIDTHS } from "../../../scripts/ci/sample-media.mjs";

// Reemplazos de los medios de ejemplo del hero para la CI y start:local (BD-050).
let dir: string;

beforeAll(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "bolik-sample-media-"));
});

afterAll(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("scripts/ci/sample-media.mjs (BD-050)", () => {
  it("usa los mismos anchos que el loader de next/image", () => {
    expect(SAMPLE_WIDTHS).toEqual([...MEDIA_WIDTHS]);
  });

  it("escribe los 6 WebP de cada póster y un video de relleno por capítulo de ejemplo", async () => {
    const written = await ensureSampleMedia(dir);
    expect(written).toBe(media.length * MEDIA_WIDTHS.length + 4);
    for (const asset of media) {
      for (const width of MEDIA_WIDTHS) {
        const info = await stat(path.join(dir, `${asset.key}-${width}.webp`));
        expect(info.size).toBeGreaterThan(0);
      }
    }
    expect((await readdir(path.join(dir, "video"))).sort()).toEqual([
      "aula-demo.mp4",
      "libreria-demo.mp4",
      "oficina-demo.mp4",
      "planta-demo.mp4",
    ]);
  });

  it("nunca pisa lo que ya está (las ilustraciones reales de media:samples)", async () => {
    const real = path.join(dir, "video", "planta-demo.mp4");
    await writeFile(real, "video real");
    expect(await ensureSampleMedia(dir)).toBe(0);
    expect(await readFile(real, "utf8")).toBe("video real");
  });
});
