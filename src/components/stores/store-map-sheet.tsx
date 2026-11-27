"use client";

import { useRef, type RefObject } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { storesPage } from "@/content/stores";
import type { StoreMapProps } from "./store-map";
import { StoreMap } from "./store-map-slot";

export type StoreMapSheetProps = StoreMapProps & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** «Ver mapa»: Radix solo devuelve el foco a un Trigger, y aquí el botón está fuera. */
  returnFocus: RefObject<HTMLButtonElement | null>;
};

/**
 * El mapa en móvil (BD-081, docs/06 §3.7): una hoja casi a pantalla completa que se descarga al
 * tocar «Ver mapa» (Radix Dialog va en este archivo; el mapa, en el suyo). Tocar un pin elige su
 * departamento y cierra la hoja: la lista filtrada queda a la vista.
 *
 * El departamento se elige cuando la hoja ya se fue (onCloseAutoFocus), no al tocar el pin: si el
 * mapa se moviera mientras la hoja sale, Leaflet terminaría su zoom animado sobre un mapa ya
 * desmontado y lanzaría un error.
 */
export default function StoreMapSheet({
  open,
  onOpenChange,
  returnFocus,
  onSelect,
  ...map
}: StoreMapSheetProps) {
  const pending = useRef<string | null>(null);
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        title={storesPage.map.title}
        className="h-[90dvh]"
        // Sin descripción: el título basta (Radix avisaría en la consola).
        aria-describedby={undefined}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          returnFocus.current?.focus();
          if (pending.current) onSelect(pending.current);
          pending.current = null;
        }}
      >
        <div className="h-full min-h-80 overflow-hidden rounded-lg bg-soft">
          <StoreMap
            {...map}
            onSelect={(slug) => {
              pending.current = slug;
              onOpenChange(false);
            }}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
