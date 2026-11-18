import "server-only";
import { env } from "@/env";
import { publicEnv } from "@/env.public";
import { getSiteSettings } from "@/server/data/content";
import { countRecentQuotesByEmail, markQuoteEmailSent } from "@/server/data/quote-requests";
import { log, logError } from "@/server/log";
import { customerQuoteAck, salesQuoteEmail, type QuoteMailData } from "./quote-emails";
import { sendMail } from "./transport";

/** Enlace del correo interno a la cotización en el admin (la pantalla llega con su ticket). */
export const adminQuoteUrl = (quoteId: number) =>
  `${publicEnv.siteUrl.replace(/\/$/, "")}/admin/cotizaciones/${quoteId}`;

/**
 * Acuses por dirección en 24 h (contando esta cotización): quien quiera usar el formulario para
 * mandar correos a terceros desde web@bolik66.com no pasa de aquí. Ventas recibe todas igual.
 */
export const ACK_GUARD = { maxPerEmail: 2, windowMs: 24 * 60 * 60_000 } as const;

/**
 * Manda los correos de una cotización ya guardada (BD-074): el interno a Ventas (ajuste
 * quote_email_to o MAIL_SALES_TO) y, si dejó correo, el acuse al cliente. La llama submitQuote con
 * after(): el visitante ya tiene su folio. Nunca lanza: cada fallo queda en el log (sin datos
 * personales). QuoteRequest.emailSentAt se marca solo cuando el interno salió de verdad
 * (SMTP_MODE=smtp); en modo prueba (file) no sale nada: quedan en MAIL_DIR y en la bandeja de
 * /styleguide/correos.
 */
export async function sendQuoteEmails(data: QuoteMailData, persisted: boolean): Promise<void> {
  let salesTo = env.MAIL_SALES_TO;
  let whatsappNumber: string | null = null;
  try {
    const settings = await getSiteSettings();
    salesTo = settings.quoteEmailTo ?? salesTo;
    whatsappNumber = settings.whatsappNumber;
  } catch (error) {
    // Sin ajustes, igual salen: a MAIL_SALES_TO y el acuse sin WhatsApp.
    logError(error, { action: "sendQuoteEmails.settings", folio: data.folio });
  }

  let salesSent = false;
  try {
    await sendMail(salesQuoteEmail(data, { to: salesTo, adminUrl: adminQuoteUrl(data.quoteId) }));
    salesSent = true;
  } catch (error) {
    logError(error, { action: "sendQuoteEmails.sales", folio: data.folio });
  }
  if (salesSent && persisted && env.SMTP_MODE === "smtp") {
    try {
      await markQuoteEmailSent(data.quoteId);
    } catch (error) {
      logError(error, { action: "markQuoteEmailSent", folio: data.folio });
    }
  }

  const ack = customerQuoteAck(data, { whatsappNumber });
  if (!ack || !data.email) return;
  try {
    const since = new Date(Date.now() - ACK_GUARD.windowMs);
    if ((await countRecentQuotesByEmail(data.email, since)) > ACK_GUARD.maxPerEmail) {
      log.info({ folio: data.folio }, "Acuse omitido: varias cotizaciones a la misma dirección");
      return;
    }
    await sendMail(ack);
  } catch (error) {
    logError(error, { action: "sendQuoteEmails.ack", folio: data.folio });
  }
}
