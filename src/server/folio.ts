import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import {
  folioYear,
  formatFolio,
  isFolioPrefix,
  MAX_FOLIO_NUMBER,
  type FolioPrefix,
} from "@/lib/folio";

/**
 * Siguiente folio consecutivo por prefijo y año (BD-033, docs/05 §4): `COT-2027-000001`.
 * Se llama DENTRO de la transacción que crea la solicitud, así el folio y el registro se guardan o
 * se revierten juntos (si la solicitud falla, el número no se gasta y no quedan huecos):
 *
 *   const quote = await db.$transaction(async (tx) => {
 *     const folio = await nextFolio(tx, "COT");
 *     return tx.quoteRequest.create({ data: { folio, ...datos } });
 *   });
 *
 * El MERGE con HOLDLOCK crea el contador del año o lo incrementa en una sola sentencia atómica:
 * con envíos simultáneos, cada transacción espera a la anterior y nunca se repite un número.
 * El año sale de la hora de Guatemala (lib/folio.ts), no del reloj del servidor.
 *
 * El bloqueo de la fila dura hasta el commit de quien llama: mientras tanto, las demás solicitudes
 * de ese prefijo esperan. Por eso: pedir el folio lo más tarde posible (después de validar y de
 * leer, justo antes del create), nada de correo ni ERP dentro de la transacción (van en after()),
 * y pasar { maxWait: 5_000, timeout: 10_000 } a db.$transaction. No atrapes los errores de aquí
 * dentro de la transacción: deben revertirla (así el número no se gasta).
 */
export async function nextFolio(
  tx: Prisma.TransactionClient,
  prefix: FolioPrefix,
  now: Date = new Date(),
): Promise<string> {
  if (!isFolioPrefix(prefix)) throw new Error(`Prefijo de folio inválido: ${String(prefix)}`);
  const year = folioYear(now);
  const rows = await tx.$queryRaw<{ lastValue: number }[]>`
    MERGE FolioSequence WITH (HOLDLOCK) AS t
    USING (SELECT CAST(${prefix} AS VARCHAR(5)) AS prefix, CAST(${year} AS INT) AS year) AS s
      ON t.prefix = s.prefix AND t.year = s.year
    WHEN MATCHED THEN UPDATE SET lastValue = t.lastValue + 1
    WHEN NOT MATCHED THEN INSERT (prefix, year, lastValue) VALUES (s.prefix, s.year, 1)
    OUTPUT inserted.lastValue;`;
  const n = rows[0]?.lastValue;
  if (!n) throw new Error(`No se pudo generar el folio ${prefix}-${year}`);
  if (n > MAX_FOLIO_NUMBER) {
    throw new Error(`Se agotó el consecutivo de ${prefix}-${year} (más de ${MAX_FOLIO_NUMBER})`);
  }
  return formatFolio(prefix, year, n);
}
