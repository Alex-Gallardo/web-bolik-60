import type { ToastTone } from "@/content/feedback";

/**
 * Estado del feedback global (docs/08 §4, BD-024): un solo diálogo a la vez, el pedido de montar
 * el toaster y el último anuncio para lectores de pantalla. Sin Zustand ni contexto: un almacén
 * mínimo que FeedbackHost lee con useSyncExternalStore.
 *
 * sonner y Radix Dialog no van en el JS inicial (docs/12 §2): sonner se importa con import() al
 * primer toast (y guarda los toasts creados antes de que el Toaster se suscriba) y el diálogo lo
 * carga FeedbackHost con dynamic() la primera vez que se pide.
 */

/** Toast tal como lo define content/feedback.ts. */
export type ToastMessage = {
  readonly tone: ToastTone;
  readonly title: string;
  readonly description?: string;
  /** Texto del botón de acción («Deshacer», «Ver cotización»). */
  readonly action?: string;
};

export type ToastOptions = {
  /** Mismo id = reemplaza al toast anterior (Buscando… → Encontramos N). */
  id?: string;
  /** Al pulsar la acción. Sin onAction, el botón no se muestra aunque el texto exista. */
  onAction?: () => void;
  /** ms; Infinity = persistente. Por defecto 4 s, 6 s con «Deshacer». */
  duration?: number;
};

/** Diálogo tal como lo define content/feedback.ts. */
export type DialogMessage = {
  readonly title: string;
  readonly body: string;
  readonly primary?: string;
  readonly secondary?: string;
};

export type DialogKind = "success" | "error" | "confirm";

export type DialogOptions = {
  kind: DialogKind;
  /** Confeti ligero (A-60, solicitud de visita escolar). */
  celebrate?: boolean;
  /** Acción principal. Si devuelve una promesa, el diálogo queda ocupado (spinner, sin Escape). */
  onPrimary?: () => unknown;
  onSecondary?: () => void;
  /** Al cerrarse por cualquier vía. */
  onClose?: () => void;
  /** Línea pequeña bajo el texto (por ejemplo, el código de referencia de un error). */
  note?: string;
  /** Botón principal rojo (confirmación destructiva). */
  destructive?: boolean;
};

export type DialogRequest = DialogMessage & DialogOptions & { id: number };

/** feedback.system.offline / online: llegan como props desde el layout (servidor). */
export type ConnectionMessages = { offline: ToastMessage; online: ToastMessage };

export type Politeness = "polite" | "assertive";

export type Announcement = { id: number; text: string; politeness: Politeness };

export type FeedbackState = {
  dialog: DialogRequest | null;
  dialogOpen: boolean;
  dialogBusy: boolean;
  toasterRequested: boolean;
  announcement: Announcement | null;
  /** Sin conexión: FeedbackHost dibuja el aviso él mismo (sin red no se puede cargar sonner). */
  offline: boolean;
};

const INITIAL: FeedbackState = {
  dialog: null,
  dialogOpen: false,
  dialogBusy: false,
  toasterRequested: false,
  announcement: null,
  offline: false,
};
let state: FeedbackState = INITIAL;
let nextId = 1;
const listeners = new Set<() => void>();

function set(patch: Partial<FeedbackState>) {
  state = { ...state, ...patch };
  for (const listener of listeners) listener();
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getState(): FeedbackState {
  return state;
}

/** Texto para la región aria-live de FeedbackHost (los errores interrumpen: assertive). */
export function announce(text: string, politeness: Politeness = "polite") {
  set({ announcement: { id: nextId++, text, politeness } });
}

/** Duración por defecto: 4 s; 6 s si ofrece «Deshacer» u otra acción (docs/08 §4). */
export function toastDuration(message: ToastMessage, options: ToastOptions = {}): number {
  if (options.duration !== undefined) return options.duration;
  return message.action && options.onAction ? 6000 : 4000;
}

/** Carga sonner al primer uso (la promesa se reutiliza). */
let sonner: Promise<typeof import("sonner")> | null = null;
export function loadSonner() {
  sonner ??= import("sonner");
  return sonner;
}

export async function showToast(message: ToastMessage, options: ToastOptions = {}) {
  if (!state.toasterRequested) set({ toasterRequested: true });
  announce(
    [message.title, message.description].filter(Boolean).join(". "),
    message.tone === "error" ? "assertive" : "polite",
  );
  const { toast } = await loadSonner();
  return toast[message.tone](message.title, {
    id: options.id,
    description: message.description,
    duration: toastDuration(message, options),
    action:
      message.action && options.onAction
        ? { label: message.action, onClick: options.onAction }
        : undefined,
  });
}

export async function dismissToast(id: string) {
  if (!sonner) return;
  (await sonner).toast.dismiss(id);
}

/**
 * Elemento que tenía el foco al abrir el diálogo. Radix solo devuelve el foco a un Dialog.Trigger y
 * aquí no hay: el diálogo lo abre una acción cualquiera (docs/08 §4: el foco vuelve a quien lo abrió).
 */
let returnFocus: HTMLElement | null = null;

/** Lo usa FriendlyDialog al cerrarse; se consume una vez. */
export function takeReturnFocus(): HTMLElement | null {
  const element = returnFocus;
  returnFocus = null;
  return element?.isConnected ? element : null;
}

/**
 * Cambio de conexión (eventos online/offline de la ventana). Sin conexión: aviso persistente que
 * dibuja FeedbackHost (no depende de cargar nada) y se anuncia. Al volver: toast de éxito.
 */
export function setConnection(online: boolean, messages: ConnectionMessages) {
  if (online !== state.offline) return;
  set({ offline: !online });
  if (online) {
    void showToast(messages.online);
  } else {
    const { title, description } = messages.offline;
    announce(`${title}. ${description}`);
  }
}

/** Abre un diálogo; si ya había uno, lo reemplaza (nunca dos a la vez). */
export function openDialog(message: DialogMessage, options: DialogOptions) {
  // Si reemplaza a otro diálogo, el foco vuelve igual al botón que abrió el primero.
  if (!state.dialogOpen && typeof document !== "undefined") {
    returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  }
  const request: DialogRequest = { ...message, ...options, id: nextId++ };
  set({ dialog: request, dialogOpen: true, dialogBusy: false });
  return request.id;
}

export function closeDialog() {
  if (!state.dialogOpen) return;
  const closing = state.dialog;
  set({ dialogOpen: false, dialogBusy: false });
  closing?.onClose?.();
}

/**
 * Acción principal: si devuelve una promesa, el diálogo queda ocupado hasta que termine. Al
 * terminar se cierra, salvo que la acción haya abierto otro diálogo (por ejemplo, el de éxito).
 */
export async function runPrimary() {
  const current = state.dialog;
  if (!current || state.dialogBusy) return;
  const result = current.onPrimary?.();
  if (result instanceof Promise) {
    set({ dialogBusy: true });
    try {
      await result;
    } finally {
      if (state.dialog?.id === current.id) set({ dialogBusy: false });
    }
  }
  if (state.dialog?.id === current.id) closeDialog();
}

export function runSecondary() {
  const current = state.dialog;
  if (!current || state.dialogBusy) return;
  current.onSecondary?.();
  if (state.dialog?.id === current.id) closeDialog();
}

/** Solo para pruebas: vuelve al estado inicial. */
export function resetFeedbackState() {
  returnFocus = null;
  sonner = null;
  state = INITIAL;
  for (const listener of listeners) listener();
}
