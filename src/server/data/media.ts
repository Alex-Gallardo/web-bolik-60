import type { PrismaClient } from "@/generated/prisma/client";
import type { ProcessedImage } from "@/server/media/process-image";

/**
 * Registro de una imagen procesada en MediaAsset (BD-034). Idempotente por clave: la misma foto
 * (mismo hash) actualiza la fila en vez de duplicarla. Recibe el cliente porque también lo usa
 * scripts/import-media.mts, que corre fuera de Next con su propio cliente (sin "server-only").
 */
export async function saveMediaAsset(
  db: Pick<PrismaClient, "mediaAsset">,
  image: Omit<ProcessedImage, "files">,
  {
    originalName,
    defaultAlt = null,
    uploadedById = null,
  }: {
    originalName: string;
    defaultAlt?: string | null;
    uploadedById?: number | null;
  },
): Promise<number> {
  const data = {
    kind: "image",
    originalName: originalName.slice(0, 200),
    mime: image.mime,
    width: image.width,
    height: image.height,
    bytes: image.bytes,
    blurDataUrl: image.blurDataUrl,
    dominantColor: image.dominantColor,
    defaultAlt: defaultAlt?.slice(0, 200) ?? null,
  };
  const upsert = () =>
    db.mediaAsset.upsert({
      where: { key: image.key },
      create: { key: image.key, ...data, uploadedById },
      // Sin pisar quién la subió ni un alt que ya se editó en el admin.
      update: { ...data, defaultAlt: undefined },
      select: { id: true },
    });
  try {
    return (await upsert()).id;
  } catch (error) {
    // En SQL Server el upsert no es atómico: dos subidas simultáneas de la misma foto pueden
    // chocar en la clave única (P2002). La segunda vez ya existe y solo actualiza.
    if ((error as { code?: unknown }).code !== "P2002") throw error;
    return (await upsert()).id;
  }
}
