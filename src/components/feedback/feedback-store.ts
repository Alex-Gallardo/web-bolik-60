import type { ToastTone } from "@/content/feedback";

/**
 * Estado del feedback global (docs/08 §4, BD-024): un solo diálogo a la vez, el pedido de montar
 * el toaster y el último anuncio para lectores de pantalla. Sin Zustand ni contexto: un almacén
 * mínimo que FeedbackHost lee con useSyncExternalStore.
 *
 * sonner y Radix Dialog no van en el JS inicial (docs/12 §2): sonner se importa con import() al
 * primer toast (y guarda los toasts creados antes de que el Toaster se suscriba) y FeedbackHost
 * importa el Toaster y el diálogo la primera vez que se piden. Si la descarga falla (sin red, o una
 * pestaña abierta durante un despliegue), nada se rompe: el aviso ya salió por aria-live y se
 * reintenta al siguiente uso.
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
  /** Cuántos toasts se pidieron: cada pedido reintenta montar el Toaster si su descarga falló. */
  toastRequests: number;
  announcement: Announcement | null;
  /** Sin conexión: FeedbackHost dibuja el aviso él mismo (sin red no se puede cargar sonner). */
  offline: boolean;
};

const INITIAL: FeedbackState = {
  dialog: null,
  dialogOpen: false,
  dialogBusy: false,
  toastRequests: 0,
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

/** Lo que dibuja el servidor: nada pendiente (useSyncExternalStore, sin desajuste al hidratar). */
export function getServerState(): FeedbackState {
  return INITIAL;
}

/** Texto para la región aria-live de FeedbackHost (los errores interrumpen: assertive). */
export function announce(text: string, politeness: Politeness = "polite") {
  set({ announcement: { id: nextId++, text, politeness } });
}

/** Vacía la región cuando ya se leyó, para que no quede texto viejo al recorrer la página. */
export function clearAnnouncement(id: number) {
  if (state.announcement?.id === id) set({ announcement: null });
}

/**
 * import() que se recuerda si resolvió y se olvida si falló (para reintentar). Lo usan sonner,
 * el Toaster y el diálogo.
 */
export function retryableImport<T>(load: () => Promise<T>): () => Promise<T> {
  let pending: Promise<T> | null = null;
  return () => {
    pending ??= load().catch((error: unknown) => {
      pending = null;
      throw error;
    });
    return pending;
  };
}

/** Duración por defecto: 4 s; 6 s si ofrece «Deshacer» u otra acción (docs/08 §4). */
export function toastDuration(message: ToastMessage, options: ToastOptions = {}): number {
  if (options.duration !== undefined) return options.duration;
  return message.action && options.onAction ? 6000 : 4000;
}

/** Carga sonner al primer uso. */
let loadSonner = retryableImport(() => import("sonner"));
let sonnerLoaded = false;

export async function showToast(message: ToastMessage, options: ToastOptions = {}) {
  set({ toastRequests: state.toastRequests + 1 });
  announce(
    [message.title, message.description].filter(Boolean).join(". "),
    message.tone === "error" ? "assertive" : "polite",
  );
  let toast;
  try {
    ({ toast } = await loadSonner());
    sonnerLoaded = true;
  } catch {
    // Sin red o archivo viejo tras un despliegue: el aviso ya se anunció; el próximo reintenta.
    return undefined;
  }
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
  if (!sonnerLoaded) return;
  (await loadSonner()).toast.dismiss(id);
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
  // Si reemplaza a otro diálogo (o se abre mientras el anterior sale), el foco vuelve igual al
  // botón que abrió el primero: nunca se guarda un botón de dentro de un diálogo.
  if (typeof document !== "undefined") {
    const active = document.activeElement;
    if (active instanceof HTMLElement && !active.closest('[role="dialog"]')) returnFocus = active;
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
  // !dialogOpen: Radix deja el diálogo clicable durante la salida; un doble clic no repite la acción.
  if (!current || !state.dialogOpen || state.dialogBusy) return;
  const result = current.onPrimary?.();
  if (result instanceof Promise) {
    set({ dialogBusy: true });
    try {
      await result;
    } catch {
      // La acción falló y no abrió otro diálogo: este queda abierto para reintentar.
      if (state.dialog?.id === current.id) set({ dialogBusy: false });
      return;
    }
    if (state.dialog?.id === current.id) set({ dialogBusy: false });
  }
  if (state.dialog?.id === current.id) closeDialog();
}

export function runSecondary() {
  const current = state.dialog;
  if (!current || !state.dialogOpen || state.dialogBusy) return;
  current.onSecondary?.();
  if (state.dialog?.id === current.id) closeDialog();
}

/** Solo para pruebas: vuelve al estado inicial. */
export function resetFeedbackState() {
  returnFocus = null;
  loadSonner = retryableImport(() => import("sonner"));
  sonnerLoaded = false;
  state = INITIAL;
  for (const listener of listeners) listener();
}
