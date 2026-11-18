"use server";

import { after } from "next/server";
import * as z from "zod/mini";
import { feedback } from "@/content/feedback";
import { getSiteSettings } from "@/server/data/content";
import { saveErpOutcome } from "@/server/data/quote-erp";
import {
  QuoteRateLimitError,
  countRecentQuotesByIp,
  departmentExists,
  resolveQuoteItems,
  saveQuoteRequest,
} from "@/server/data/quote-requests";
import { sendQuoteToErp } from "@/server/erp/send-quote";
import { log, logError } from "@/server/log";
import { requestIpHash } from "@/server/request-ip";
import type { QuoteContactField } from "./form-fields";
import { QUOTE_GUARD } from "./guard";
import { contactErrors, quoteContactSchema, quoteLinesSchema } from "./schema";

export type SubmitQuoteResult =
  | { ok: true; data: { folio: string } }
  | {
      ok: false;
      /**
       * invalid: datos o líneas no válidos (con `fields`, junto a cada campo); tooFast: antes del
       * tiempo mínimo; rateLimited: más de 5 envíos en 10 min desde la misma IP; unavailable: no se
       * pudo guardar (la página ofrece WhatsApp, y la lista sigue guardada en el navegador).
       */
      error: "invalid" | "staleItems" | "tooFast" | "rateLimited" | "unavailable";
      fields?: Partial<Record<QuoteContactField, string>>;
      /** Con staleItems: las referencias (SKU) que ya no se pueden cotizar; hay que quitarlas. */
      stale?: string[];
      /** Con unavailable por un fallo del servidor: código para el diálogo y el log. */
      reference?: string;
    };

/** Lo que manda el formulario además de los datos: el honeypot y el tiempo de llenado. */
export type SubmitQuoteMeta = {
  /** Campo trampa, oculto para las personas: si llega con algo, lo llenó un bot. */
  website?: unknown;
  /** Milisegundos desde que se abrió el formulario (reloj del navegador, sin comparar relojes). */
  elapsedMs?: unknown;
};

/**
 * Enviar la cotización (BD-073, docs/03 §5): valida, guarda con su folio en una transacción y
 * responde enseguida; SAP (y los correos, BD-074) van después con after(), sin hacer esperar al
 * visitante. Nunca lanza: cualquier fallo es { ok: false } con un error que la página sabe mostrar.
 */
export async function submitQuote(
  contact: unknown,
  lines: unknown,
  meta: SubmitQuoteMeta = {},
): Promise<SubmitQuoteResult> {
  // Honeypot lleno: no se guarda. Respuesta de «no se pudo» y no de éxito: si fuera una persona (un
  // autocompletado raro), no pierde su cotización creyendo que llegó; el diálogo ofrece WhatsApp.
  if (typeof meta.website === "string" && meta.website.trim() !== "") {
    log.warn("Cotización descartada: campo trampa lleno");
    return { ok: false, error: "unavailable" };
  }
  if (
    typeof meta.elapsedMs !== "number" ||
    !Number.isFinite(meta.elapsedMs) ||
    meta.elapsedMs < QUOTE_GUARD.minFillMs
  )
    return { ok: false, error: "tooFast" };

  const parsedContact = z.safeParse(quoteContactSchema, contact);
  if (!parsedContact.success)
    return { ok: false, error: "invalid", fields: contactErrors(contact) };
  const parsedLines = z.safeParse(quoteLinesSchema, lines);
  if (!parsedLines.success) return { ok: false, error: "invalid" };

  try {
    const ipHash = await requestIpHash();
    const since = new Date(Date.now() - QUOTE_GUARD.windowMs);
    if ((await countRecentQuotesByIp(ipHash, since)) >= QUOTE_GUARD.maxPerWindow)
      return { ok: false, error: "rateLimited" };

    if (!(await departmentExists(parsedContact.data.department)))
      return {
        ok: false,
        error: "invalid",
        fields: { department: feedback.forms.errors.required },
      };
    // Un producto que ya no se ve o una presentación que no es suya (lista vieja o alterada).
    const resolved = await resolveQuoteItems(parsedLines.data);
    if (!resolved.ok)
      return resolved.stale.length > 0
        ? { ok: false, error: "staleItems", stale: resolved.stale }
        : { ok: false, error: "invalid" };

    // El recuento de arriba evita trabajo con una IP que ya pasó el límite; el que vale se repite
    // dentro de la transacción (dos envíos simultáneos no se lo saltan).
    const saved = await saveQuoteRequest(
      { contact: parsedContact.data, items: resolved.items, ipHash },
      { max: QUOTE_GUARD.maxPerWindow, windowMs: QUOTE_GUARD.windowMs },
    );

    // Después de responder: SAP (docs/03 §5). Con DATA_SOURCE=fixtures no quedó nada en la base que
    // mandar. Con el interruptor del admin apagado queda `omitida`: así la tarea de reintento (que
    // toma las `pendiente`) no la manda después. Los correos llegan con BD-074.
    if (saved.persisted)
      after(async () => {
        try {
          const settings = await getSiteSettings();
          if (settings.erpEnabled) await sendQuoteToErp(saved.id);
          else await saveErpOutcome(saved.id, { erpStatus: "omitida" });
        } catch (error) {
          logError(error, { action: "submitQuote.after", folio: saved.folio });
        }
      });

    return { ok: true, data: { folio: saved.folio } };
  } catch (error) {
    if (error instanceof QuoteRateLimitError) return { ok: false, error: "rateLimited" };
    const reference = logError(error, { action: "submitQuote" });
    return { ok: false, error: "unavailable", reference };
  }
}
