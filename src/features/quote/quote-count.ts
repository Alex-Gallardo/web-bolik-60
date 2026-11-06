"use client";

import { useState, useSyncExternalStore } from "react";

/**
 * Clave de localStorage de la cotización: la misma del store de BD-070 (zustand `persist`, forma
 * `{ state: { lines: [...] }, version }`). Hasta que llegue BD-070, el contador del header la lee
 * directo; BD-070 cambia esta lectura por un selector del store, sin tocar el header.
 */
export const QUOTE_STORAGE_KEY = "bolik_quote";

/** Cuántas líneas tiene la cotización guardada (0 si no hay, o si está dañada). */
export function parseQuoteCount(raw: string | null): number {
  if (!raw) return 0;
  try {
    const lines = (JSON.parse(raw) as { state?: { lines?: unknown } })?.state?.lines;
    return Array.isArray(lines) ? lines.length : 0;
  } catch {
    return 0;
  }
}

function readCount(): number {
  try {
    return parseQuoteCount(window.localStorage.getItem(QUOTE_STORAGE_KEY));
  } catch {
    return 0; // localStorage bloqueado (modo privado estricto)
  }
}

/** Cambios desde otras pestañas (el evento storage no llega a la pestaña que escribe). */
function subscribe(onChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === QUOTE_STORAGE_KEY || event.key === null) onChange();
  };
  window.addEventListener("storage", onStorage);
  return () => window.removeEventListener("storage", onStorage);
}

const noop = () => () => {};

/**
 * Número de líneas de la cotización y una clave que cambia cada vez que sube (para reiniciar la
 * animación «pop», A-05). En el servidor y al hidratar vale 0: el número llega justo después, sin
 * animarse (solo se anima cuando el visitante agrega algo).
 */
export function useQuoteCount(): { count: number; popKey: number } {
  const count = useSyncExternalStore(subscribe, readCount, () => 0);
  const hydrated = useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
  const [seen, setSeen] = useState<number | null>(null);
  const [popKey, setPopKey] = useState(0);
  // Estado derivado del render anterior (patrón de React): se anima solo si sube después de hidratar.
  if (hydrated && seen !== count) {
    if (seen !== null && count > seen) setPopKey((key) => key + 1);
    setSeen(count);
  }
  return { count, popKey };
}
