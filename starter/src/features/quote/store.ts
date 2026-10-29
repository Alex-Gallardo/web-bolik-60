"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { QUOTE_LIMITS, type PackagingCode, type QuoteItemType } from "@/lib/constants";

/**
 * Cotización del visitante (docs/07 §2.3). Vive en localStorage; no hay cuenta ni carrito de compra.
 * Los textos de los toasts salen de content/feedback.ts: este store NO muestra mensajes, solo
 * devuelve el resultado para que el componente decida qué feedback mostrar.
 */
export type QuoteLine = {
  key: string; // `${type}:${ref}:${packaging}`
  type: QuoteItemType;
  ref: string; // SKU (variante), id del kit o slug de categoría
  name: string; // "Bolik Ultra"
  detail?: string; // "Azul · PT00058"
  packaging?: PackagingCode;
  quantity: number;
  image?: string; // ruta base de /media
  url: string; // para volver a la ficha
  addedAt: number;
};

type AddInput = Omit<QuoteLine, "key" | "quantity" | "addedAt"> & { quantity?: number };
export type AddResult = { ok: true; merged: boolean; line: QuoteLine } | { ok: false; reason: "limit" };

type QuoteState = {
  lines: QuoteLine[];
  lastRemoved?: { line: QuoteLine; index: number };
  add: (input: AddInput) => AddResult;
  setQuantity: (key: string, quantity: number) => void;
  remove: (key: string) => void;
  undoRemove: () => void;
  clear: () => void;
};

export const lineKey = (type: QuoteItemType, ref: string, packaging?: PackagingCode) => `${type}:${ref}:${packaging ?? "-"}`;
const clampQty = (n: number) => Math.min(QUOTE_LIMITS.maxQty, Math.max(QUOTE_LIMITS.minQty, Math.round(n) || 1));

export const useQuote = create<QuoteState>()(
  persist(
    (set, get) => ({
      lines: [],
      add: (input) => {
        const key = lineKey(input.type, input.ref, input.packaging);
        const existing = get().lines.find((l) => l.key === key);
        if (existing) {
          const line = { ...existing, quantity: clampQty(existing.quantity + (input.quantity ?? 1)) };
          set({ lines: get().lines.map((l) => (l.key === key ? line : l)) });
          return { ok: true, merged: true, line };
        }
        if (get().lines.length >= QUOTE_LIMITS.maxLines) return { ok: false, reason: "limit" };
        const line: QuoteLine = { ...input, key, quantity: clampQty(input.quantity ?? 1), addedAt: Date.now() };
        set({ lines: [...get().lines, line] });
        return { ok: true, merged: false, line };
      },
      setQuantity: (key, quantity) =>
        set({ lines: get().lines.map((l) => (l.key === key ? { ...l, quantity: clampQty(quantity) } : l)) }),
      remove: (key) => {
        const index = get().lines.findIndex((l) => l.key === key);
        if (index < 0) return;
        set({ lastRemoved: { line: get().lines[index]!, index }, lines: get().lines.filter((l) => l.key !== key) });
      },
      undoRemove: () => {
        const r = get().lastRemoved;
        if (!r) return;
        const lines = [...get().lines];
        lines.splice(Math.min(r.index, lines.length), 0, r.line);
        set({ lines, lastRemoved: undefined });
      },
      clear: () => set({ lines: [], lastRemoved: undefined }),
    }),
    {
      name: "bolik_quote",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ lines: s.lines }),
      // Si cambia la forma de QuoteLine, sube `version` y migra aquí (nunca borres la lista del visitante).
      migrate: (persisted, version) => {
        const state = persisted as { lines?: QuoteLine[] };
        if (version < 1) return { lines: [] };
        return { lines: (state.lines ?? []).slice(0, QUOTE_LIMITS.maxLines) };
      },
    },
  ),
);

/** Selectores (evitan renders innecesarios). */
export const useQuoteCount = () => useQuote((s) => s.lines.length);
