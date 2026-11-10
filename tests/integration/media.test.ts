import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { saveMediaAsset } from "@/server/data/media";
import { processImage } from "@/server/media/process-image";
import { db } from "@/server/db";

// Registro de imágenes procesadas en MediaAsset (BD-034) contra BolikDigital_Test.
const FOLDER = "it-bd034";
let mediaDir: string;

beforeAll(async () => {
  sharp.cache(false);
  mediaDir = await mkdtemp(path.join(tmpdir(), "bolik-media-it-"));
  await db.mediaAsset.deleteMany({ where: { key: { startsWith: `${FOLDER}/` } } });
});

afterAll(async () => {
  await db.mediaAsset.deleteMany({ where: { key: { startsWith: `${FOLDER}/` } } });
  await db.$disconnect();
  await rm(mediaDir, { recursive: true, force: true });
});

describe("saveMediaAsset (BD-034)", () => {
  it("registra la imagen y volver a importarla no la duplica ni pisa el alt editado", async () => {
    const photo = await sharp({
      create: { width: 1200, height: 900, channels: 3, background: { r: 29, g: 63, b: 206 } },
    })
      .jpeg()
      .toBuffer();
    const image = await processImage(photo, { folder: FOLDER, name: "Bolik Ultra azul", mediaDir });

    const id = await saveMediaAsset(db, image, {
      originalName: "bolik-ultra-azul.jpg",
      defaultAlt: "Bolik Ultra azul",
    });
    await db.mediaAsset.update({ where: { id }, data: { defaultAlt: "Editado en el admin" } });
    const again = await saveMediaAsset(
      db,
      await processImage(photo, { folder: FOLDER, name: "Bolik Ultra azul", mediaDir }),
      {
        originalName: "bolik-ultra-azul.jpg",
        defaultAlt: "Otro alt",
      },
    );

    expect(again).toBe(id);
    const rows = await db.mediaAsset.findMany({ where: { key: { startsWith: `${FOLDER}/` } } });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      key: image.key,
      kind: "image",
      mime: "image/webp",
      width: 1200,
      height: 900,
      originalName: "bolik-ultra-azul.jpg",
      defaultAlt: "Editado en el admin",
    });
    expect(rows[0]!.blurDataUrl).toMatch(/^data:image\/webp;base64,/);
    expect(rows[0]!.dominantColor).toMatch(/^#[0-9A-F]{6}$/);
  }, 60_000);
});
