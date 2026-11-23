import { showToast } from "@/components/feedback/feedback-store";
import { feedback } from "@/content/feedback";
import { QUOTE_POP_EVENT } from "@/features/quote/storage-keys";
import { useQuote, type AddInput } from "@/features/quote/store";

export type AddToQuoteInput = AddInput & {
  /** «Bolik Ultra Azul»: lo que dice el toast. */
  displayName: string;
  /** Unidad para el toast según la cantidad: «cajillas de 12», «unidad». */
  unit: (quantity: number) => string;
  /** «Ver cotización» del toast. */
  onView: () => void;
};

/**
 * Agregar a la cotización desde la ficha (BD-062). Va en su propio módulo: la ficha lo descarga al
 * primer clic con zustand y los textos de feedback.ts, así no pesan en su JS inicial (docs/12 §2).
 * Respuesta (docs/08 §4): toast `quote.added` con «Ver cotización» y el «pop» del contador, también
 * si la línea ya estaba (el número no sube); con 50 líneas, `quote.limit`.
 */
export function addToQuote({ displayName, unit, onView, ...input }: AddToQuoteInput) {
  const result = useQuote.getState().add(input);
  if (!result.ok) {
    showToast(feedback.quote.limit);
    return result;
  }
  if (result.merged) window.dispatchEvent(new Event(QUOTE_POP_EVENT));
  const quantity = input.quantity ?? 1;
  showToast(feedback.quote.added(displayName, quantity, unit(quantity)), { onAction: onView });
  return result;
}
