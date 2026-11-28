"use client";

import { useId, useRef, useState, type ComponentType, type ReactNode } from "react";
import { showToast } from "@/components/feedback/feedback-store";
import { buttonVariants } from "@/components/ui/button-variants";
import { feedback } from "@/content/feedback";
import { storesPage } from "@/content/stores";
import type { StoreMapProps } from "./store-map";
import type { StoreMapSheetProps } from "./store-map-sheet";
import { StoreMapSlot } from "./store-map-slot";

/** La hoja del mapa en móvil (Radix Dialog y el mapa): se descarga al tocar «Ver mapa». */
const loadSheet = () => import("./store-map-sheet").then((m) => m.default);

/**
 * «Ver mapa» en móvil (BD-081): la primera vez descarga la hoja (el botón queda ocupado); si falla,
 * el aviso del mapa. Devuelve el botón y la hoja, que cada página pone donde quiere. `mapProps`
 * debe ser estable (useMemo y useCallback): el mapa vuelve a encuadrar si cambia.
 */
export function useStoreMapSheet(mapProps: StoreMapProps, buttonClassName?: string) {
  const button = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [Sheet, setSheet] = useState<ComponentType<StoreMapSheetProps> | null>(null);
  const [loading, setLoading] = useState(false);

  const openMap = async () => {
    if (Sheet) {
      setOpen(true);
      return;
    }
    if (loading) return;
    setLoading(true);
    try {
      const component = await loadSheet();
      setSheet(() => component);
      setOpen(true);
    } catch {
      void showToast(feedback.stores.mapFailed);
    } finally {
      setLoading(false);
    }
  };

  return {
    button: (
      <button
        ref={button}
        type="button"
        onClick={() => void openMap()}
        aria-busy={loading || undefined}
        className={buttonVariants({ variant: "outline", className: buttonClassName })}
      >
        {storesPage.map.open}
      </button>
    ),
    sheet: Sheet ? (
      <Sheet {...mapProps} open={open} onOpenChange={setOpen} returnFocus={button} />
    ) : null,
  };
}

type StoreMapLayoutProps = { map: StoreMapProps; children: ReactNode };

/**
 * La lista y, con JS y desde lg, el mapa al lado, fijo al bajar (BD-081). Sin JS, solo la lista. El
 * mapa se descarga al entrar en pantalla (store-map-slot.tsx).
 */
export function StoreMapLayout({ map, children }: StoreMapLayoutProps) {
  const titleId = useId();
  return (
    <div className="flex flex-col gap-8 lg:[html.js_&]:grid lg:[html.js_&]:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      {children}
      <section
        aria-labelledby={titleId}
        className="js-only hidden self-start lg:sticky lg:top-[calc(var(--header-h)+1rem)] lg:block"
      >
        <h2 id={titleId} className="sr-only">
          {storesPage.map.title}
        </h2>
        <StoreMapSlot
          {...map}
          className="h-[min(36rem,calc(100dvh-var(--header-h)-2rem))] overflow-hidden rounded-xl bg-soft"
        />
      </section>
    </div>
  );
}
