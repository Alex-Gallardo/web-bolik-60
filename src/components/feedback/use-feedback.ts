import {
  closeDialog,
  dismissToast,
  openDialog,
  showToast,
  type DialogMessage,
  type DialogOptions,
  type ToastMessage,
  type ToastOptions,
} from "./feedback-store";

const api = {
  /** Toast con un mensaje de content/feedback.ts: `toast(feedback.quote.added(...), { onAction })`. */
  toast: (message: ToastMessage, options?: ToastOptions) => void showToast(message, options),
  dismissToast: (id: string) => void dismissToast(id),
  /** FriendlyDialog con un mensaje de content/feedback.ts. Reemplaza al que esté abierto. */
  dialog: (message: DialogMessage, options: DialogOptions) => openDialog(message, options),
  closeDialog,
};

export type Feedback = typeof api;

/**
 * Feedback amigable (docs/08 §4, BD-024). Los textos salen siempre de content/feedback.ts; este
 * hook no acepta textos sueltos más allá de lo que esos mensajes definen. Requiere FeedbackHost
 * montado en el layout.
 */
export function useFeedback(): Feedback {
  return api;
}
