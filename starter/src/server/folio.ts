import "server-only";
import type { Prisma } from "@/generated/prisma/client";

export type FolioPrefix = "COT" | "ESC" | "DIS";

/**
 * Folio consecutivo por prefijo y año: COT-2027-000001.
 * Debe llamarse DENTRO de db.$transaction para que el folio y el registro se guarden juntos.
 * MERGE con HOLDLOCK evita duplicados con envíos simultáneos (prueba: 20 en paralelo, docs/13 §4).
 */
export async function nextFolio(tx: Prisma.TransactionClient, prefix: FolioPrefix, now = new Date()) {
  const year = now.getFullYear();
  const rows = await tx.$queryRaw<{ lastValue: number }[]>`
    MERGE FolioSequence WITH (HOLDLOCK) AS t
    USING (SELECT ${prefix} AS prefix, ${year} AS year) AS s
      ON t.prefix = s.prefix AND t.year = s.year
    WHEN MATCHED THEN UPDATE SET lastValue = t.lastValue + 1
    WHEN NOT MATCHED THEN INSERT (prefix, year, lastValue) VALUES (s.prefix, s.year, 1)
    OUTPUT inserted.lastValue;`;
  const n = rows[0]?.lastValue;
  if (!n) throw new Error(`No se pudo generar el folio ${prefix}-${year}`);
  return formatFolio(prefix, year, n);
}

export function formatFolio(prefix: FolioPrefix, year: number, n: number) {
  return `${prefix}-${year}-${String(n).padStart(6, "0")}`;
}

export const FOLIO_REGEX = /^(COT|ESC|DIS)-\d{4}-\d{6}$/;
