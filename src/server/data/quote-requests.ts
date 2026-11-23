import "server-only";
import { env } from "@/env";
import type { QuoteContact, QuoteLineInput } from "@/features/quote/schema";
import { PACKAGING_LABELS, type PackagingCode } from "@/lib/constants";
import { folioYear, formatFolio } from "@/lib/folio";
import { log } from "@/server/log";
import { findVariantByCode, getProduct } from "./catalog";
import { getDepartment } from "./stores";

/**
 * Guardar una cotización (BD-073, docs/03 §5) y contar las recientes de una IP (límite de envíos).
 * Con DATA_SOURCE=db, en SQL Server dentro de una transacción con el folio (BD-033). Con
 * `fixtures` (desarrollo y CI, sin base) se guardan en memoria con su propio consecutivo: así se
 * prueba el camino completo; producción no arranca con `fixtures` (env.schema).
 */

/** Una línea lista para guardar: lo legible lo arma el servidor desde el catálogo. */
export type QuoteItemDraft = {
  sku: string;
  /** Las partes de la descripción, para la tabla de los correos (BD-074). */
  productName: string;
  colorName: string;
  /** «Cajilla de 12»; null sin presentación. */
  packagingName: string | null;
  packagingCode: PackagingCode | null;
  /** «Bolik Ultra Azul PT00058 · Cajilla de 12» (QuoteItem.description, 250). */
  description: string;
  quantity: number;
  /** «cajillas de 12», «unidades» (QuoteItem.unitLabel, 30). */
  unitLabel: string;
};

export type NewQuoteRequest = {
  contact: QuoteContact;
  items: QuoteItemDraft[];
  ipHash: string;
};

/** persisted: quedó en SQL Server (con fixtures, en memoria: no hay nada que mandar a SAP). */
export type SavedQuote = { id: number; folio: string; persisted: boolean };

/** Límite de envíos por hash de IP (docs/03 §8). */
export type IpLimit = { max: number; windowMs: number };

/** Ya hay `max` cotizaciones de esta IP en la ventana: la transacción se revierte. */
export class QuoteRateLimitError extends Error {
  constructor() {
    super("Límite de cotizaciones por IP");
    this.name = "QuoteRateLimitError";
  }
}

/** Las líneas comprobadas, o las referencias que ya no están en el catálogo publicado. */
export type ResolvedItems = { ok: true; items: QuoteItemDraft[] } | { ok: false; stale: string[] };

/**
 * Las líneas tal como llegan del navegador, comprobadas contra el catálogo publicado: el SKU
 * existe y se ve, y la presentación es de ese producto. Nombre, color y presentación salen del
 * catálogo, nunca del navegador. null si alguna no es válida (solo «variante» por ahora: kits y
 * categorías llegan con sus tickets). Las que no pasan se devuelven en `stale`: la página le dice al
 * visitante cuáles quitar, en vez de un error que reintentar no arregla.
 */
export async function resolveQuoteItems(lines: QuoteLineInput[]): Promise<ResolvedItems> {
  const items: QuoteItemDraft[] = [];
  const stale: string[] = [];
  for (const line of lines) {
    const match = line.type === "variante" ? await findVariantByCode(line.ref) : null;
    if (!match || match.variant.sku !== line.ref) {
      stale.push(line.ref);
      continue;
    }
    let packName: string | null = null;
    if (line.packaging) {
      const product = await getProduct(match.product.category.slug, match.product.slug);
      const pack = product?.packagings.find((p) => p.code === line.packaging);
      if (!pack) {
        stale.push(line.ref);
        continue;
      }
      packName = pack.name;
    }
    const base = `${match.product.name} ${match.variant.color.name} ${match.variant.sku}`;
    items.push({
      sku: match.variant.sku,
      productName: match.product.name,
      colorName: match.variant.color.name,
      packagingName: packName,
      packagingCode: line.packaging ?? null,
      description: (packName ? `${base} · ${packName}` : base).slice(0, 250),
      quantity: line.quantity,
      unitLabel: (line.packaging ? PACKAGING_LABELS[line.packaging].plural : "unidades").slice(
        0,
        30,
      ),
    });
  }
  if (stale.length > 0) return { ok: false, stale };
  // La misma variante y presentación dos veces (navegador alterado; el store no lo permite).
  const keys = new Set(items.map((i) => `${i.sku}:${i.packagingCode}`));
  return keys.size === items.length ? { ok: true, items } : { ok: false, stale: [] };
}

/** Nombre del departamento (el formulario manda su slug); null si no existe. */
export async function departmentName(slug: string): Promise<string | null> {
  return (await getDepartment(slug))?.name ?? null;
}

async function getDb() {
  if (env.DATA_SOURCE !== "db") return null;
  return (await import("@/server/db")).db;
}

// ── Sin base (fixtures): en memoria, con su propio consecutivo por año ──
type MemoryQuote = SavedQuote & { ipHash: string; createdAt: number; request: NewQuoteRequest };
const memory = globalThis as unknown as { bolikQuotes?: MemoryQuote[] };
const memoryQuotes = () => (memory.bolikQuotes ??= []);
/** Tope en memoria: una sesión larga de desarrollo no acumula datos de contacto sin fin. */
const MEMORY_MAX = 500;

/** Solo para pruebas: vacía las cotizaciones en memoria. */
export function resetMemoryQuotes() {
  memory.bolikQuotes = [];
}

/**
 * Guarda la cotización con su folio `COT-AAAA-NNNNNN`. En SQL Server: el folio se pide al final de
 * la transacción, justo antes del create (el bloqueo del contador dura hasta el commit), sin
 * correo ni ERP adentro (van en after()) y sin atrapar errores de nextFolio (deben revertirla).
 */
export async function saveQuoteRequest(
  input: NewQuoteRequest,
  limit: IpLimit,
  now: Date = new Date(),
): Promise<SavedQuote> {
  const since = new Date(now.getTime() - limit.windowMs);
  const db = await getDb();
  if (!db) {
    // En memoria no hay carreras (un solo hilo): contar y guardar van seguidos.
    const recent = memoryQuotes().filter(
      (q) => q.ipHash === input.ipHash && q.createdAt >= since.getTime(),
    ).length;
    if (recent >= limit.max) throw new QuoteRateLimitError();
    const year = folioYear(now);
    const sameYear = memoryQuotes().filter((q) => q.folio.startsWith(`COT-${year}-`)).length;
    const last = memoryQuotes().at(-1)?.id ?? 0;
    const saved = { id: last + 1, folio: formatFolio("COT", year, sameYear + 1), persisted: false };
    if (memoryQuotes().length >= MEMORY_MAX) memoryQuotes().shift();
    memoryQuotes().push({
      ...saved,
      ipHash: input.ipHash,
      createdAt: now.getTime(),
      request: input,
    });
    log.info({ folio: saved.folio }, "Cotización guardada en memoria (DATA_SOURCE=fixtures)");
    return saved;
  }

  const { contact, items } = input;
  const [department, variants] = await Promise.all([
    db.department.findUnique({ where: { slug: contact.department }, select: { id: true } }),
    db.productVariant.findMany({
      where: { sku: { in: items.map((i) => i.sku) } },
      select: { id: true, sku: true },
    }),
  ]);
  const variantId = new Map(variants.map((v) => [v.sku, v.id]));
  const { nextFolio } = await import("@/server/folio");

  return db.$transaction(
    async (tx) => {
      const folio = await nextFolio(tx, "COT", now);
      // El límite se cuenta aquí, después del MERGE del contador: ese bloqueo pone en fila a todas
      // las cotizaciones, así que dos envíos simultáneos de la misma IP no ven el mismo recuento.
      // Lanzar revierte la transacción (el folio no se gasta).
      const recent = await tx.quoteRequest.count({
        where: { ipHash: input.ipHash, createdAt: { gte: since } },
      });
      if (recent >= limit.max) throw new QuoteRateLimitError();
      const quote = await tx.quoteRequest.create({
        data: {
          folio,
          customerType: contact.customerType,
          // La columna no admite NULL: con «Otro» sin institución, el nombre de la persona.
          organization: contact.organization ?? contact.name,
          contactName: contact.name,
          phone: contact.phone ?? null,
          email: contact.email ?? null,
          departmentId: department?.id ?? null,
          municipality: contact.municipality ?? null,
          notes: contact.notes ?? null,
          source: "web",
          ipHash: input.ipHash,
          items: {
            create: items.map((item, index) => ({
              itemType: "variante",
              variantId: variantId.get(item.sku) ?? null,
              packagingCode: item.packagingCode,
              description: item.description,
              quantity: item.quantity,
              unitLabel: item.unitLabel,
              sortOrder: index,
            })),
          },
        },
        select: { id: true, folio: true },
      });
      return { ...quote, persisted: true };
    },
    { maxWait: 5_000, timeout: 10_000 },
  );
}

/** Cotizaciones de este hash de IP desde `since` (límite de envíos, docs/03 §8). */
export async function countRecentQuotesByIp(ipHash: string, since: Date): Promise<number> {
  const db = await getDb();
  if (!db)
    return memoryQuotes().filter((q) => q.ipHash === ipHash && q.createdAt >= since.getTime())
      .length;
  return db.quoteRequest.count({ where: { ipHash, createdAt: { gte: since } } });
}

/** El correo a Ventas salió (BD-074): QuoteRequest.emailSentAt. Sin base, no hay nada que marcar. */
export async function markQuoteEmailSent(quoteId: number, at: Date = new Date()): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.quoteRequest.update({ where: { id: quoteId }, data: { emailSentAt: at } });
}

/**
 * Cotizaciones con este correo desde `since` (BD-074): el acuse no debe servir para mandar
 * correos a cualquier dirección desde web@bolik66.com (docs/15, «Paso a producción»).
 */
export async function countRecentQuotesByEmail(email: string, since: Date): Promise<number> {
  const db = await getDb();
  const wanted = email.toLowerCase();
  if (!db)
    return memoryQuotes().filter(
      (q) => q.request.contact.email?.toLowerCase() === wanted && q.createdAt >= since.getTime(),
    ).length;
  return db.quoteRequest.count({ where: { email: wanted, createdAt: { gte: since } } });
}
