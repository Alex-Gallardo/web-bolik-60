import type { CUSTOMER_TYPES, PackagingCode } from "@/lib/constants";

/**
 * Gateway del ERP (BD-035, docs/03 §5-6, docs/05 §8): la web habla con SAP solo a través de
 * SMART-K66, y nunca depende de que esté arriba. Cada llamada devuelve un resultado; nunca lanza.
 */

/** Prospecto que se crea en SAP con una cotización (POST /api/web/prospectos, doc 05 §8). */
export type ErpLead = {
  folio: string;
  customerType: (typeof CUSTOMER_TYPES)[number];
  organization: string;
  contactName: string;
  phone: string | null;
  email: string | null;
  department: string | null;
  notes: string | null;
  lines: {
    itemCode: string | null; // SKU de SAP; null para líneas de kit, categoría o personalizadas
    packaging: PackagingCode | null;
    quantity: number;
    description: string;
  }[];
};

/** Artículo de SAP (GET /api/web/articulos, doc 05 §8): lo usa la sincronización (BD-036). */
export type ErpArticle = {
  itemCode: string;
  itemName: string;
  barcode: string | null;
  active: boolean;
  salesUnit: string | null;
  unitsPerSalesUnit: number | null;
  updatedAt: string;
};

/**
 * Por qué falló una llamada:
 * - unavailable: red caída, timeout, 5xx o 429 (pasajero: se reintenta más tarde);
 * - unauthorized: 401/403, la clave de la API venció o la rotaron (operación debe cambiarla);
 * - rejected: otro 4xx, los datos están mal: reintentar no lo arregla;
 * - invalid-response: respondió algo que no cumple el contrato.
 */
export type ErpFailure = {
  kind: "unavailable" | "unauthorized" | "rejected" | "invalid-response";
  /**
   * Texto fijo para el log y para QuoteRequest.erpLastError: nunca datos personales ni texto de la
   * respuesta de SMART-K66 (el mensaje del log no pasa por redact(); solo sus campos).
   */
  message: string;
  status?: number;
  retryable: boolean;
};

export type ErpLeadResult =
  | { status: "sent"; reference: string }
  | { status: "skipped" } // ERP apagado (ERP_MODE=noop)
  | { status: "failed"; failure: ErpFailure };

export type ErpArticlesResult =
  | { status: "ok"; articles: ErpArticle[] }
  | { status: "skipped" }
  | { status: "failed"; failure: ErpFailure };

export type ErpGateway = {
  readonly mode: "noop" | "smartk66";
  createLead(lead: ErpLead): Promise<ErpLeadResult>;
  /**
   * Artículos de una marca (`BOLIK` por defecto; BD-038 pide también las del grupo) cambiados
   * desde `since` (todos si no se indica).
   */
  listArticles(since?: Date, brand?: string): Promise<ErpArticlesResult>;
};
