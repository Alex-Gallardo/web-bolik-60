import "server-only";
import { sealData, unsealData } from "iron-session";
import { cookies } from "next/headers";
import { env } from "@/env";
import { FOLIO_REGEX } from "@/lib/folio";

/**
 * Folios que envió este navegador (BD-075, docs/06 §3.17): el resumen de /cotizacion/enviada/[folio]
 * solo se ve en el navegador que mandó la cotización; con otro folio, un mensaje sin datos. Cifrados
 * con SESSION_SECRET (iron-session, como la sesión del admin): no se pueden leer ni inventar.
 */
export const QUOTE_RECEIPT_COOKIE = "bolik_cotizacion";
/** Los últimos 5 folios, por 7 días. */
export const QUOTE_RECEIPT_MAX = 5;
export const QUOTE_RECEIPT_SECONDS = 7 * 24 * 60 * 60;

/**
 * Lo sellado lleva su tipo: con la misma clave se sella la sesión del admin, y un sello de un uso no
 * debe servir para el otro.
 */
const KIND = "quote-receipts";
type Receipts = { kind?: unknown; folios?: unknown };

const sealOptions = () => ({ password: env.SESSION_SECRET, ttl: QUOTE_RECEIPT_SECONDS });

/** Solo folios con su formato: lo que no lo tenga se descarta. */
function validFolios(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((f): f is string => typeof f === "string" && FOLIO_REGEX.test(f))
    : [];
}

/** Los folios guardados; [] sin cookie, vencida, dañada o de otra clave. */
export async function readQuoteReceipts(): Promise<string[]> {
  const sealed = (await cookies()).get(QUOTE_RECEIPT_COOKIE)?.value;
  if (!sealed) return [];
  try {
    const data = await unsealData<Receipts>(sealed, sealOptions());
    return data.kind === KIND ? validFolios(data.folios) : [];
  } catch {
    return [];
  }
}

/** Anota el folio (solo en una Server Action o un route handler: escribe la cookie). */
export async function rememberQuoteReceipt(folio: string): Promise<void> {
  const folios = [folio, ...(await readQuoteReceipts()).filter((f) => f !== folio)].slice(
    0,
    QUOTE_RECEIPT_MAX,
  );
  // Cada envío renueva los 7 días de la cookie (con sus folios anteriores).
  const sealed = await sealData({ kind: KIND, folios }, sealOptions());
  (await cookies()).set(QUOTE_RECEIPT_COOKIE, sealed, {
    httpOnly: true,
    // En desarrollo y en la E2E (http) el navegador no guardaría una cookie `secure`.
    secure: env.APP_ENV !== "development",
    sameSite: "lax",
    path: "/cotizacion",
    maxAge: QUOTE_RECEIPT_SECONDS,
  });
}
