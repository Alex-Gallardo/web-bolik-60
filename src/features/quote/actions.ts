"use server";

import * as z from "zod/mini";
import { contactErrors, quoteContactSchema, quoteLinesSchema } from "./schema";
import type { QuoteContactField } from "./form-fields";

export type SubmitQuoteResult =
  | { ok: true; data: { folio: string } }
  | {
      ok: false;
      error: "invalid" | "unavailable";
      /** Con "invalid": el error de cada campo, para pintarlo junto a su control. */
      fields?: Partial<Record<QuoteContactField, string>>;
    };

/**
 * Enviar la cotización (docs/03 §6). BD-072 deja lista la validación en el servidor con el mismo
 * esquema del formulario (features/quote/schema.ts); guardar, el folio, los correos y SAP llegan
 * con BD-073 (honeypot, tiempo mínimo, límite por IP, transacción y `after()`). Hasta entonces
 * responde "unavailable" y la página ofrece enviarla por WhatsApp (feedback.quote.failed): los
 * productos siguen guardados en el navegador.
 */
export async function submitQuote(contact: unknown, lines: unknown): Promise<SubmitQuoteResult> {
  if (!z.safeParse(quoteContactSchema, contact).success)
    return { ok: false, error: "invalid", fields: contactErrors(contact) };
  if (!z.safeParse(quoteLinesSchema, lines).success) return { ok: false, error: "invalid" };
  return { ok: false, error: "unavailable" };
}
