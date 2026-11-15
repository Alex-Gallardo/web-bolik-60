"use client";

import { useState, useSyncExternalStore } from "react";
import { QUOTE_CHANGE_EVENT, QUOTE_STORAGE_KEY, countStoredLines } from "./storage-keys";

/**
 * Último número que avisó el store (QUOTE_CHANGE_EVENT): con localStorage bloqueado la lista vive
 * en memoria del store y aquí no se puede leer.
 */
let announced: number | null = null;

function readCount(): number {
  if (announced !== null) return announced;
  try {
    return countStoredLines(window.localStorage.getItem(QUOTE_STORAGE_KEY));
  } catch {
    return 0; // localStorage bloqueado y el store todavía no habló
  }
}

/** Cambios en esta pestaña (el store avisa al guardar) y en otras (evento storage). */
function subscribe(onChange: () => void) {
  const onAnnounce = (event: Event) => {
    announced = (event as CustomEvent<number>).detail;
    onChange();
  };
  const onStorage = (event: StorageEvent) => {
    if (event.key === QUOTE_STORAGE_KEY || event.key === null) {
      announced = null; // otra pestaña escribió: se lee lo guardado
      onChange();
    }
  };
  window.addEventListener(QUOTE_CHANGE_EVENT, onAnnounce);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(QUOTE_CHANGE_EVENT, onAnnounce);
    window.removeEventListener("storage", onStorage);
  };
}

const noop = () => () => {};

/**
 * Número de líneas de la cotización y una clave que cambia cada vez que sube (para reiniciar la
 * animación «pop», A-05). No importa el store (BD-070): lee lo guardado (storage-keys.ts) y se
 * entera de los cambios por eventos, así zustand no va en el JS de todas las
 * páginas. En el servidor y al hidratar vale 0: el número llega justo después, sin animarse.
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
