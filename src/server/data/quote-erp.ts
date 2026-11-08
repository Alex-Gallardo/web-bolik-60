import "server-only";
import { env } from "@/env";
import { CUSTOMER_TYPES, PACKAGING_CODES } from "@/lib/constants";
import type { ErpLead } from "@/server/erp/types";
import { log } from "@/server/log";

/**
 * Lo que el envío al ERP (BD-035) lee y escribe de una cotización: la cotización como prospecto
 * de SMART-K66 (doc 05 §8) y el resultado en QuoteRequest (erpStatus, erpRef, erpAttempts…).
 * Con DATA_SOURCE=fixtures no hay base ni cotizaciones.
 */

export type QuoteForErp = { erpStatus: string; erpAttempts: number; lead: ErpLead };

const isCustomerType = (v: string): v is ErpLead["customerType"] =>
  (CUSTOMER_TYPES as readonly string[]).includes(v);
const isPackaging = (v: string | null): v is (typeof PACKAGING_CODES)[number] =>
  v !== null && (PACKAGING_CODES as readonly string[]).includes(v);

async function getDb() {
  if (env.DATA_SOURCE !== "db") return null;
  return (await import("@/server/db")).db;
}

export async function loadQuoteForErp(quoteId: number): Promise<QuoteForErp | null> {
  const db = await getDb();
  if (!db) return null;
  const quote = await db.quoteRequest.findUnique({
    where: { id: quoteId },
    include: {
      department: { select: { name: true } },
      items: {
        orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
        include: { variant: { select: { sku: true } } },
      },
    },
  });
  if (!quote) return null;
  if (!isCustomerType(quote.customerType)) {
    log.warn(
      { quoteId, customerType: quote.customerType },
      "ERP: tipo de cliente desconocido; va como «otro»",
    );
  }
  return {
    erpStatus: quote.erpStatus,
    erpAttempts: quote.erpAttempts,
    lead: {
      folio: quote.folio,
      customerType: isCustomerType(quote.customerType) ? quote.customerType : "otro",
      organization: quote.organization,
      contactName: quote.contactName,
      phone: quote.phone,
      email: quote.email,
      department: quote.department?.name ?? null,
      notes: quote.notes,
      lines: quote.items.map((item) => {
        if (item.packagingCode && !isPackaging(item.packagingCode)) {
          log.warn({ quoteId, packagingCode: item.packagingCode }, "ERP: presentación desconocida");
        }
        return {
          itemCode: item.variant?.sku ?? null,
          packaging: isPackaging(item.packagingCode) ? item.packagingCode : null,
          quantity: item.quantity,
          description: item.description,
        };
      }),
    },
  };
}

/**
 * Reclama la cotización para un intento (compare-and-set sobre erpAttempts): si otro proceso la
 * está mandando o ya quedó enviada, devuelve false y no se manda dos veces (el `after()` de
 * BD-073 y la tarea de reintento pueden tomarla a la vez). Cada intento real suma 1 a erpAttempts,
 * aunque por dentro el gateway haga hasta 4 peticiones.
 */
export async function claimQuoteForErp(quoteId: number, erpAttempts: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const { count } = await db.quoteRequest.updateMany({
    where: { id: quoteId, erpAttempts, erpStatus: { not: "enviada" } },
    data: { erpAttempts: { increment: 1 } },
  });
  return count === 1;
}

export type ErpOutcome =
  | { erpStatus: "enviada"; reference: string }
  | { erpStatus: "omitida" }
  | { erpStatus: "pendiente" | "error"; message: string };

/** Guarda el resultado. Nada baja a una cotización que ya quedó `enviada` (llegue tarde quien llegue). */
export async function saveErpOutcome(quoteId: number, outcome: ErpOutcome, at = new Date()) {
  const db = await getDb();
  if (!db) return;
  if (outcome.erpStatus === "enviada") {
    await db.quoteRequest.update({
      where: { id: quoteId },
      data: { erpStatus: "enviada", erpRef: outcome.reference, erpSentAt: at, erpLastError: null },
    });
    return;
  }
  await db.quoteRequest.updateMany({
    where: { id: quoteId, erpStatus: { not: "enviada" } },
    data:
      outcome.erpStatus === "omitida"
        ? { erpStatus: "omitida" }
        : { erpStatus: outcome.erpStatus, erpLastError: outcome.message.slice(0, 1000) },
  });
}
