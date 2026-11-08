import "server-only";
import {
  claimQuoteForErp,
  loadQuoteForErp,
  saveErpOutcome,
  type ErpOutcome,
} from "@/server/data/quote-erp";
import { log } from "@/server/log";
import { getErpGateway } from "./gateway";
import type { ErpGateway } from "./types";

/**
 * Envía una cotización ya guardada a SAP como prospecto (BD-035) y guarda el resultado. La llama
 * submitQuote con `after()` (BD-073: el visitante no espera) y la tarea de reintento (BD-128,
 * BD-145) con las que quedaron `pendiente`. Nunca lanza: si algo falla, queda registrado.
 *
 * erpStatus (docs/03 §5):
 * - enviada: SAP la recibió (erpRef = referencia del prospecto);
 * - omitida: el ERP está apagado (ERP_MODE=noop);
 * - pendiente: SMART-K66 no respondió o falló de forma pasajera; la reintenta la tarea;
 * - error: SMART-K66 la rechazó, no aceptó la clave o respondió fuera del contrato; reintentar no
 *   lo arregla, la revisa una persona.
 * Antes de llamar, la cotización se reclama (claimQuoteForErp): dos procesos nunca la mandan a la
 * vez, una ya enviada no se vuelve a mandar y nada la baja de `enviada`.
 */
export async function sendQuoteToErp(
  quoteId: number,
  gateway: ErpGateway = getErpGateway(),
): Promise<ErpOutcome | null> {
  let context: { folio?: string; reference?: string } = {};
  try {
    const quote = await loadQuoteForErp(quoteId);
    if (!quote) {
      log.warn({ quoteId }, "ERP: la cotización no existe");
      return null;
    }
    context = { folio: quote.lead.folio };
    if (quote.erpStatus === "enviada") return null;

    if (gateway.mode === "noop") {
      const outcome: ErpOutcome = { erpStatus: "omitida" };
      await saveErpOutcome(quoteId, outcome);
      return outcome;
    }
    if (!(await claimQuoteForErp(quoteId, quote.erpAttempts))) {
      log.info({ quoteId, folio: quote.lead.folio }, "ERP: otro proceso ya la está mandando");
      return null;
    }

    const result = await gateway.createLead(quote.lead);
    if (result.status === "sent") context.reference = result.reference;
    const outcome: ErpOutcome =
      result.status === "sent"
        ? { erpStatus: "enviada", reference: result.reference }
        : result.status === "skipped"
          ? { erpStatus: "omitida" }
          : {
              erpStatus: result.failure.retryable ? "pendiente" : "error",
              message: result.failure.message,
            };
    await saveErpOutcome(quoteId, outcome);
    if (result.status === "failed") {
      const fields = {
        quoteId,
        folio: quote.lead.folio,
        kind: result.failure.kind,
        status: result.failure.status,
        reason: result.failure.message,
      };
      // Una clave vencida afecta a todas las cotizaciones: es un aviso para operación.
      if (result.failure.kind === "unauthorized")
        log.error(fields, "ERP: SMART-K66 no aceptó la clave");
      else log.warn(fields, "ERP: no se pudo enviar la cotización");
    }
    return outcome;
  } catch (error) {
    // Con `reference`, SAP ya la recibió aunque no se pudo guardar: sirve para conciliar a mano.
    log.error(
      { quoteId, ...context, err: error },
      "ERP: no se pudo enviar ni registrar la cotización",
    );
    return null;
  }
}
