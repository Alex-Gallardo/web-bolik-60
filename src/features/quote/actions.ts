"use server";

import { after } from "next/server";
import * as z from "zod/mini";
import { feedback } from "@/content/feedback";
import { getSiteSettings } from "@/server/data/content";
import { saveErpOutcome } from "@/server/data/quote-erp";
import {
  QuoteRateLimitError,
  countRecentQuotesByIp,
  departmentName,
  resolveQuoteItems,
  saveQuoteRequest,
} from "@/server/data/quote-requests";
import { sendQuoteToErp } from "@/server/erp/send-quote";
import { sendQuoteEmails } from "@/server/mail/send-quote-emails";
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

    const department = await departmentName(parsedContact.data.department);
    if (!department)
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

    // Después de responder (el visitante ya tiene su folio), cada cosa por su lado:
    // - Correos (BD-074): a Ventas y el acuse. Con SMTP_MODE=file quedan en tmp/mails.
    // - SAP (docs/03 §5), solo si quedó en la base: con el interruptor del admin apagado queda
    //   `omitida` (la tarea de reintento solo toma las `pendiente`).
    const c = parsedContact.data;
    after(() =>
      sendQuoteEmails(
        {
          quoteId: saved.id,
          folio: saved.folio,
          customerType: c.customerType,
          organization: c.organization,
          name: c.name,
          phone: c.phone,
          email: c.email,
          departmentName: department,
          municipality: c.municipality,
          notes: c.notes,
          items: resolved.items,
          createdAt: new Date(),
        },
        saved.persisted,
      ),
    );
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
