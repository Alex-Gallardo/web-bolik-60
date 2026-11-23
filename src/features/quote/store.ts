import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import { QUOTE_LIMITS } from "@/lib/constants";
import {
  QUOTE_CHANGE_EVENT,
  QUOTE_STORAGE_KEY,
  QUOTE_STORAGE_VERSION,
  clampQuantity,
  countStoredLines,
  lineKey,
  sanitizeLines,
  type QuoteLine,
} from "./lines";

export {
  QUOTE_CHANGE_EVENT,
  QUOTE_STORAGE_KEY,
  QUOTE_STORAGE_VERSION,
  clampQuantity,
  lineKey,
  sanitizeLines,
  type QuoteLine,
};

/**
 * Cotización del visitante (BD-070, docs/07 §2.3). Vive en el navegador (localStorage): no hay
 * cuenta ni carrito de compra. El store NO muestra mensajes: devuelve el resultado y quien lo usa
 * elige el feedback de content/feedback.ts (la ficha, BD-062; el drawer, BD-071). Solo lo cargan
 * las páginas que agregan o editan (zustand no va en el JS común); lo puro está en lines.ts.
 */
export type AddInput = Omit<QuoteLine, "key" | "quantity" | "addedAt"> & { quantity?: number };
export type AddResult =
  { ok: true; merged: boolean; line: QuoteLine } | { ok: false; reason: "limit" };

type QuoteState = {
  lines: QuoteLine[];
  /** La última línea quitada y su lugar, para «Deshacer». */
  lastRemoved?: { line: QuoteLine; index: number };
  /** La lista antes de vaciarla, para «Deshacer» (feedback.quote.cleared). */
  lastCleared?: QuoteLine[];
  add: (input: AddInput) => AddResult;
  setQuantity: (key: string, quantity: number) => void;
  remove: (key: string) => void;
  undoRemove: () => void;
  clear: () => void;
  undoClear: () => void;
};

/**
 * Dónde se guarda: localStorage; en memoria si el navegador lo bloquea (modo privado estricto) o
 * se llena (la cotización sigue funcionando en la pestaña). En el servidor no hay almacenamiento:
 * lanzar aquí hace que persist no guarde nada (nada compartido entre visitantes).
 */
export function quoteStorage(getLocal: () => Storage = () => window.localStorage): StateStorage {
  if (typeof window === "undefined") throw new Error("Sin almacenamiento en el servidor");
  const memory = new Map<string, string>();
  let local: Storage | null = null;
  try {
    const candidate = getLocal();
    const probe = "__bolik_probe__";
    candidate.setItem(probe, "1");
    candidate.removeItem(probe);
    local = candidate;
  } catch {
    local = null;
  }
  return {
    getItem: (name) => (local ? local.getItem(name) : (memory.get(name) ?? null)),
    setItem: (name, value) => {
      try {
        if (local) local.setItem(name, value);
        else memory.set(name, value);
      } catch {
        memory.set(name, value); // cuota llena: la lista sigue en la pestaña
      }
      window.dispatchEvent(
        new CustomEvent(QUOTE_CHANGE_EVENT, { detail: countStoredLines(value) }),
      );
    },
    removeItem: (name) => {
      memory.delete(name);
      try {
        local?.removeItem(name);
      } catch {
        // sin acceso: no hay nada que quitar
      }
    },
  };
}

export const useQuote = create<QuoteState>()(
  persist(
    (set, get) => ({
      lines: [],
      add: (input) => {
        const key = lineKey(input.type, input.ref, input.packaging);
        const quantity = clampQuantity(input.quantity ?? 1);
        const existing = get().lines.find((line) => line.key === key);
        // Si se vuelve a agregar lo que se acababa de quitar, «Deshacer» ya no lo repone.
        const lastRemoved = get().lastRemoved?.line.key === key ? undefined : get().lastRemoved;
        if (existing) {
          // Suma la cantidad; nombre, detalle y ruta quedan como estaban (son del mismo SKU).
          const line = { ...existing, quantity: clampQuantity(existing.quantity + quantity) };
          set({ lines: get().lines.map((l) => (l.key === key ? line : l)), lastRemoved });
          return { ok: true, merged: true, line };
        }
        if (get().lines.length >= QUOTE_LIMITS.maxLines) return { ok: false, reason: "limit" };
        const line: QuoteLine = { ...input, key, quantity, addedAt: Date.now() };
        set({ lines: [...get().lines, line], lastRemoved, lastCleared: undefined });
        return { ok: true, merged: false, line };
      },
      setQuantity: (key, quantity) =>
        set({
          lines: get().lines.map((l) =>
            l.key === key ? { ...l, quantity: clampQuantity(quantity) } : l,
          ),
        }),
      remove: (key) => {
        const index = get().lines.findIndex((l) => l.key === key);
        if (index < 0) return;
        set({
          lastRemoved: { line: get().lines[index]!, index },
          lines: get().lines.filter((l) => l.key !== key),
        });
      },
      undoRemove: () => {
        const removed = get().lastRemoved;
        if (!removed) return;
        const lines = get().lines;
        // Ya está otra vez (se volvió a agregar) o no cabe: no se duplica ni pasa de 50.
        if (
          lines.some((l) => l.key === removed.line.key) ||
          lines.length >= QUOTE_LIMITS.maxLines
        ) {
          set({ lastRemoved: undefined });
          return;
        }
        const next = [...lines];
        next.splice(Math.min(removed.index, next.length), 0, removed.line);
        set({ lines: next, lastRemoved: undefined });
      },
      clear: () => set({ lastCleared: get().lines, lines: [], lastRemoved: undefined }),
      undoClear: () => {
        const cleared = get().lastCleared;
        if (!cleared) return;
        set({ lines: sanitizeLines([...cleared, ...get().lines]), lastCleared: undefined });
      },
    }),
    {
      name: QUOTE_STORAGE_KEY,
      version: QUOTE_STORAGE_VERSION,
      storage: createJSONStorage(() => quoteStorage()),
      partialize: (state) => ({ lines: state.lines }),
      // Si cambia la forma de QuoteLine, sube `version` y migra aquí; nunca se vacía la lista.
      migrate: (persisted) => ({
        lines: sanitizeLines((persisted as { lines?: unknown } | null)?.lines),
      }),
      // Lo guardado pasa por el mismo filtro (un dato editado a mano no rompe la cotización).
      merge: (persisted, current) => ({
        ...current,
        lines: sanitizeLines((persisted as { lines?: unknown } | null)?.lines),
      }),
    },
  ),
);

/**
 * Otras pestañas: el evento storage no llega a la pestaña que escribe; en las demás, el store
 * vuelve a leer la lista guardada (solo cambios de localStorage).
 */
if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.storageArea !== window.localStorage) return;
    if (event.key === QUOTE_STORAGE_KEY || event.key === null) void useQuote.persist.rehydrate();
  });
}
