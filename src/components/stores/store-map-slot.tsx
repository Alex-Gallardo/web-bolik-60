"use client";

import { useEffect, useRef, useState, type ComponentType } from "react";
import { feedback } from "@/content/feedback";
import { storesPage } from "@/content/stores";
import type { StoreMapProps } from "./store-map";

/** Si el archivo del mapa no llega (sin red, despliegue nuevo): el aviso, y la lista sigue. */
function MapFailed() {
  return (
    <p className="grid size-full place-items-center px-6 text-center text-muted">
      {feedback.stores.mapFailed.title}
    </p>
  );
}

function MapLoading() {
  return (
    <p className="grid size-full place-items-center px-6 text-center text-muted">
      {storesPage.map.loading}
    </p>
  );
}

type MapComponent = ComponentType<StoreMapProps>;
let loading: Promise<MapComponent> | undefined;

/**
 * Leaflet, React-Leaflet y su CSS en un archivo aparte (docs/12: ≤ 60 KB, fuera de la carga
 * inicial), descargado una sola vez para el lugar de escritorio y la hoja de móvil. import()
 * directo y no next/dynamic, que pesaría en la carga inicial. Si falla, el aviso; el siguiente
 * intento vuelve a pedirlo.
 */
function loadStoreMap(): Promise<MapComponent> {
  loading ??= import("./store-map").then(
    (m) => m.default,
    () => {
      loading = undefined;
      return MapFailed;
    },
  );
  return loading;
}

/** El mapa, descargado al montarse (Leaflet usa window: nunca en el servidor). */
export function StoreMap(props: StoreMapProps) {
  const [Map, setMap] = useState<MapComponent | null>(null);
  useEffect(() => {
    let live = true;
    void loadStoreMap().then((component) => {
      if (live) setMap(() => component);
    });
    return () => {
      live = false;
    };
  }, []);
  return Map ? <Map {...props} /> : <MapLoading />;
}

/** Ya cargó la página (load): el mapa nunca compite con el LCP ni con el JS de la página. */
function afterLoad(run: () => void): () => void {
  if (document.readyState === "complete") {
    run();
    return () => {};
  }
  window.addEventListener("load", run, { once: true });
  return () => window.removeEventListener("load", run);
}

type StoreMapSlotProps = StoreMapProps & { className?: string };

/**
 * Lugar del mapa en escritorio (BD-081, docs/06 §3.7): aparta su alto (sin CLS) y descarga el mapa
 * cuando ya cargó la página y el lugar entra en pantalla. En móvil el lugar está oculto (display:
 * none nunca entra en pantalla) y el mapa llega con «Ver mapa».
 */
export function StoreMapSlot({ className, ...map }: StoreMapSlotProps) {
  const slot = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = slot.current;
    if (!element || visible) return;
    let observer: IntersectionObserver | undefined;
    const cancel = afterLoad(() => {
      // Sin IntersectionObserver (navegador muy viejo): el mapa se carga ya, tras load.
      if (typeof IntersectionObserver === "undefined") {
        setVisible(true);
        return;
      }
      observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            observer?.disconnect();
            setVisible(true);
          }
        },
        { rootMargin: "200px" },
      );
      observer.observe(element);
    });
    return () => {
      cancel();
      observer?.disconnect();
    };
  }, [visible]);

  return (
    <div ref={slot} className={className}>
      {visible ? <StoreMap {...map} /> : <MapLoading />}
    </div>
  );
}
