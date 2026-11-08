import "server-only";
import { z } from "zod";
import type { ErpArticle, ErpFailure, ErpGateway, ErpLead } from "./types";

/**
 * Cliente de SMART-K66 (ERP_MODE=smartk66, BD-035) con el contrato propuesto del doc 05 §8.
 * - Cada intento espera como mucho `timeoutMs` (8 s); los fallos pasajeros (red, timeout, 5xx,
 *   429) se reintentan `retries` veces (3) con espera exponencial y algo de azar (0.5 s, 1 s, 2 s).
 *   Un 4xx no se reintenta: los datos o la clave están mal.
 * - El prospecto lleva `Idempotency-Key` con el folio: si una respuesta se pierde y se reintenta,
 *   SMART-K66 no crea el prospecto dos veces.
 * - Las respuestas se validan con Zod: algo fuera del contrato es un error claro.
 * Nunca lanza y nunca pone datos personales en `failure.message` (va al log y a erpLastError).
 */

export type SmartK66Options = {
  baseUrl: string;
  apiKey: string;
  timeoutMs?: number;
  retries?: number;
  /** Espera base del backoff (se duplica en cada reintento). */
  backoffMs?: number;
  /** Inyectable en pruebas para no esperar de verdad. */
  sleep?: (ms: number) => Promise<void>;
  fetch?: typeof fetch;
};

const leadResponseSchema = z.object({ referencia: z.string().trim().min(1).max(40) });

const articleSchema = z.object({
  itemCode: z.string().trim().min(1).max(30),
  itemName: z.string().trim().min(1).max(200),
  barcode: z.string().trim().max(20).nullable().optional(),
  active: z.boolean(),
  salesUnit: z.string().trim().max(40).nullable().optional(),
  unitsPerSalesUnit: z.number().int().positive().nullable().optional(),
  updatedAt: z.string().min(1),
});

const isTimeout = (error: unknown) =>
  error instanceof DOMException && error.name === "TimeoutError";

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

type Attempt = { ok: true; status: number; body: unknown } | { ok: false; failure: ErpFailure };

/** RequestInit con encabezados como objeto plano (se mezclan con los del cliente). */
type Init = Omit<RequestInit, "headers" | "signal" | "redirect"> & {
  headers?: Record<string, string>;
};

/** 408 (timeout del servidor), 409 (la misma Idempotency-Key en curso), 429 y 5xx: pasajeros. */
const isTransient = (status: number) =>
  status === 408 || status === 409 || status === 429 || status >= 500;

/** Descarta el cuerpo sin leerlo; si eso falla, da igual (nunca debe lanzar). */
const discard = (response: Response) => response.body?.cancel().catch(() => {});

export function createSmartK66Gateway({
  baseUrl,
  apiKey,
  timeoutMs = 8_000,
  retries = 3,
  backoffMs = 500,
  sleep = defaultSleep,
  // Se busca en cada llamada (no al crear el cliente): así lo intercepta MSW en las pruebas.
  fetch: fetchImpl = (...args) => fetch(...args),
}: SmartK66Options): ErpGateway {
  const base = baseUrl.replace(/\/+$/, "");

  /** Un intento: respuesta 2xx con JSON, o el motivo del fallo (sin lanzar). */
  async function attempt(path: string, init: Init): Promise<Attempt> {
    let response: Response;
    try {
      response = await fetchImpl(`${base}${path}`, {
        ...init,
        headers: {
          Accept: "application/json",
          Authorization: `ApiKey ${apiKey}`,
          ...init.headers,
        },
        // La URL sale del entorno y nunca debe redirigir (un 301/302 volvería GET el POST).
        redirect: "error",
        // Cubre la respuesta completa: encabezados y cuerpo.
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (error) {
      return { ok: false, failure: unavailable(isTimeout(error)) };
    }
    if (isTransient(response.status)) {
      await discard(response);
      return {
        ok: false,
        failure: {
          kind: "unavailable",
          message: `SMART-K66 respondió ${response.status}`,
          status: response.status,
          retryable: true,
        },
      };
    }
    if (response.status === 401 || response.status === 403) {
      await discard(response);
      // La clave venció o la rotaron: todas las llamadas fallarán igual hasta que operación la cambie.
      return {
        ok: false,
        failure: {
          kind: "unauthorized",
          message: `SMART-K66 no aceptó la clave de la API (${response.status})`,
          status: response.status,
          retryable: false,
        },
      };
    }
    if (!response.ok) {
      await discard(response);
      return {
        ok: false,
        failure: {
          kind: "rejected",
          message: `SMART-K66 rechazó la petición (${response.status})`,
          status: response.status,
          retryable: false,
        },
      };
    }
    try {
      return { ok: true, status: response.status, body: await response.json() };
    } catch (error) {
      // Solo un JSON mal formado está fuera del contrato; un corte o un timeout a media lectura
      // es tan pasajero como no haber recibido nada.
      if (error instanceof SyntaxError) {
        return {
          ok: false,
          failure: {
            kind: "invalid-response",
            message: "SMART-K66 respondió algo que no es JSON",
            status: response.status,
            retryable: false,
          },
        };
      }
      return { ok: false, failure: unavailable(isTimeout(error), "cortó la respuesta") };
    }
  }

  function unavailable(
    timedOut: boolean,
    otherwise = "no está disponible (error de red)",
  ): ErpFailure {
    return {
      kind: "unavailable",
      message: timedOut
        ? `SMART-K66 no respondió en ${timeoutMs / 1000} s`
        : `SMART-K66 ${otherwise}`,
      retryable: true,
    };
  }

  /** Reintenta lo pasajero con espera exponencial (más un poco de azar para no sincronizarse). */
  async function request(path: string, init: Init): Promise<Attempt> {
    let result = await attempt(path, init);
    for (let i = 0; i < retries && !result.ok && result.failure.retryable; i += 1) {
      const wait = backoffMs * 2 ** i;
      await sleep(wait + Math.floor(Math.random() * (wait / 4)));
      result = await attempt(path, init);
    }
    return result;
  }

  const invalid = (detail: string): ErpFailure => ({
    kind: "invalid-response",
    message: `Respuesta de SMART-K66 fuera del contrato: ${detail}`,
    retryable: false,
  });

  return {
    mode: "smartk66",

    async createLead(lead: ErpLead) {
      const result = await request("/api/web/prospectos", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": lead.folio },
        body: JSON.stringify(toProspecto(lead)),
      });
      if (!result.ok) return { status: "failed", failure: result.failure };
      const parsed = leadResponseSchema.safeParse(result.body);
      if (!parsed.success) return { status: "failed", failure: invalid("falta «referencia»") };
      return { status: "sent", reference: parsed.data.referencia };
    },

    async listArticles(since?: Date) {
      const query = new URLSearchParams({ marca: "BOLIK" });
      if (since) query.set("desde", since.toISOString());
      const result = await request(`/api/web/articulos?${query}`, { method: "GET" });
      if (!result.ok) return { status: "failed", failure: result.failure };
      const parsed = z.array(articleSchema).safeParse(result.body);
      if (!parsed.success) return { status: "failed", failure: invalid("artículos inválidos") };
      const articles: ErpArticle[] = parsed.data.map((a) => ({
        itemCode: a.itemCode,
        itemName: a.itemName,
        barcode: a.barcode ?? null,
        active: a.active,
        salesUnit: a.salesUnit ?? null,
        unitsPerSalesUnit: a.unitsPerSalesUnit ?? null,
        updatedAt: a.updatedAt,
      }));
      return { status: "ok", articles };
    },
  };
}

/** El prospecto con los nombres de campo del contrato de SMART-K66 (doc 05 §8). */
export function toProspecto(lead: ErpLead) {
  return {
    folio: lead.folio,
    tipoCliente: lead.customerType,
    organizacion: lead.organization,
    contacto: lead.contactName,
    telefono: lead.phone,
    correo: lead.email,
    departamento: lead.department,
    lineas: lead.lines.map((line) => ({
      itemCode: line.itemCode,
      presentacion: line.packaging,
      cantidad: line.quantity,
      descripcion: line.description,
    })),
    notas: lead.notes,
  };
}
