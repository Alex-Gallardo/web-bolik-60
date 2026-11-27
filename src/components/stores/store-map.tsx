"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useMemo } from "react";
import { MapContainer, Marker, TileLayer, ZoomControl, useMap } from "react-leaflet";
import { REDUCED_MOTION_QUERY } from "@/components/hero/video-policy";
import { storesPage } from "@/content/stores";
import type { MapDepartment, MapStore } from "@/features/stores/nearby";

/** Mapa base de OpenStreetMap (CSP img-src en next.config.ts; su política exige la atribución). */
const TILES = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
/** Zoom al elegir un departamento: se ven su cabecera y sus alrededores. */
const DEPARTMENT_ZOOM = 10;
/** El escalonado de A-34 llega hasta 8 pasos (docs/09 §6), como el revelado. */
const MAX_STAGGER = 7;

const escapeHtml = (text: string) => text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/**
 * Pin propio (A-34, motion.css): un círculo con el número de tiendas (vacío en el de una tienda).
 * Un divIcon y no la imagen de Leaflet (sus rutas no sobreviven al bundler). Leaflet le da
 * role="button" y tabindex 0: el nombre para el lector de pantalla va en el span oculto.
 * `data-pin` (el departamento) sirve para marcar el pin elegido. El escalonado va en un style
 * en línea: depende de style-src 'unsafe-inline' de la CSP (docs/15 §6), como el resto del sitio.
 */
function pinIcon(pin: string, label: string, count: number | null, index: number) {
  const dot = count === null ? "" : count.toLocaleString("es-GT");
  return L.divIcon({
    className: "store-pin",
    html: `<span class="store-pin__dot" data-pin="${escapeHtml(pin)}" style="--i:${Math.min(index, MAX_STAGGER)}" aria-hidden="true">${escapeHtml(dot)}</span><span class="sr-only">${escapeHtml(label)}</span>`,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  });
}

/**
 * Clic y teclado: Leaflet hace enfocable el pin (role="button") pero no lo activa con Enter ni
 * Espacio, como haría un <button>. Espacio no baja la página.
 */
function pinEvents(select: () => void): L.LeafletEventHandlerFnMap {
  return {
    click: select,
    keydown: (event) => {
      const key = (event as L.LeafletKeyboardEvent).originalEvent;
      if (key.key !== "Enter" && key.key !== " ") return;
      key.preventDefault();
      select();
    },
  };
}

export type StoreMapProps = {
  /** Departamentos con tiendas: un pin cada uno, en su centro. */
  departments: MapDepartment[];
  /** Tiendas con coordenadas verificadas por Ventas (hoy ninguna): un pin cada una. */
  stores: MapStore[];
  selected: string | undefined;
  /** Estable entre renders (useCallback): los pines no se vuelven a enganchar en cada uno. */
  onSelect: (slug: string) => void;
};

/** Centra el departamento elegido; sin elegir, encuadra todos los pines. */
function FitView({ departments, selected }: Pick<StoreMapProps, "departments" | "selected">) {
  const map = useMap();
  useEffect(() => {
    const animate = !window.matchMedia(REDUCED_MOTION_QUERY).matches;
    const department = departments.find((d) => d.slug === selected);
    if (department) map.setView([department.lat, department.lng], DEPARTMENT_ZOOM, { animate });
    else if (departments.length > 0)
      map.fitBounds(L.latLngBounds(departments.map((d) => [d.lat, d.lng])), {
        padding: [40, 40],
        animate,
      });
  }, [map, departments, selected]);
  return null;
}

/**
 * Marca el pin del departamento elegido (clase y aria-pressed) sin cambiar su ícono: Leaflet
 * rehace el contenido del ícono, el pin volvería a caer y el foco del teclado se perdería. Va
 * después de los pines: React corre los efectos en orden y React-Leaflet ya los agregó al mapa.
 * Si los íconos cambian, Leaflet rehace la clase: se vuelve a marcar.
 */
function ActivePin({ selected, icons }: { selected: string | undefined; icons: unknown }) {
  const map = useMap();
  useEffect(() => {
    void icons;
    for (const dot of map.getContainer().querySelectorAll<HTMLElement>("[data-pin]")) {
      const pin = dot.closest<HTMLElement>(".store-pin");
      if (!pin || dot.parentElement !== pin) continue;
      const active = dot.dataset.pin === selected;
      pin.classList.toggle("store-pin--active", active);
      pin.setAttribute("aria-pressed", String(active));
    }
  }, [map, selected, icons]);
  return null;
}

/**
 * Sin el prefijo «Leaflet» (y su bandera): queda solo la atribución de OpenStreetMap. El contenedor
 * es enfocable (Leaflet: flechas para mover el mapa): role="group" y su nombre para el lector.
 */
function MapSetup() {
  const map = useMap();
  useEffect(() => {
    map.attributionControl?.setPrefix(false);
    const container = map.getContainer();
    container.setAttribute("role", "group");
    container.setAttribute("aria-label", storesPage.map.title);
  }, [map]);
  return null;
}

/**
 * Mapa de tiendas de /donde-comprar (BD-081, docs/06 §3.7). Se descarga aparte (Leaflet,
 * React-Leaflet y su CSS): store-map-slot.tsx lo importa al entrar en pantalla en escritorio, y la
 * hoja de móvil al tocar «Ver mapa». Tocar un pin elige su departamento, como el selector, que
 * sigue siendo la forma equivalente de elegir. La rueda no hace zoom (no atrapa el scroll de la
 * página); con movimiento reducido, sin animaciones de zoom ni de entrada.
 */
export default function StoreMap({ departments, stores, selected, onSelect }: StoreMapProps) {
  const reduced = useMemo(() => window.matchMedia(REDUCED_MOTION_QUERY).matches, []);
  const icons = useMemo(
    () =>
      new Map([
        ...departments.map(
          (d, index) =>
            [
              d.slug,
              pinIcon(d.slug, storesPage.map.pin(d.name, d.storeCount), d.storeCount, index),
            ] as const,
        ),
        ...stores.map(
          (s, index) =>
            [
              `tienda:${s.slug}`,
              pinIcon(s.department, s.name, null, departments.length + index),
            ] as const,
        ),
      ]),
    [departments, stores],
  );
  const events = useMemo(
    () =>
      new Map([
        ...departments.map((d) => [d.slug, pinEvents(() => onSelect(d.slug))] as const),
        ...stores.map(
          (s) => [`tienda:${s.slug}`, pinEvents(() => onSelect(s.department))] as const,
        ),
      ]),
    [departments, stores, onSelect],
  );

  return (
    <MapContainer
      className="store-map size-full"
      center={[15.5, -90.3]}
      zoom={7}
      scrollWheelZoom={false}
      zoomControl={false}
      zoomAnimation={!reduced}
      fadeAnimation={!reduced}
      markerZoomAnimation={!reduced}
    >
      <TileLayer url={TILES} attribution={storesPage.map.attribution} maxZoom={18} />
      <ZoomControl
        position="topright"
        zoomInTitle={storesPage.map.zoomIn}
        zoomOutTitle={storesPage.map.zoomOut}
      />
      <MapSetup />
      <FitView departments={departments} selected={selected} />
      {departments.map((department) => (
        <Marker
          key={department.slug}
          position={[department.lat, department.lng]}
          icon={icons.get(department.slug)!}
          keyboard
          eventHandlers={events.get(department.slug)}
        />
      ))}
      {stores.map((store) =>
        store.point ? (
          <Marker
            key={store.slug}
            position={[store.point.lat, store.point.lng]}
            icon={icons.get(`tienda:${store.slug}`)!}
            keyboard
            eventHandlers={events.get(`tienda:${store.slug}`)}
          />
        ) : null,
      )}
      <ActivePin selected={selected} icons={icons} />
    </MapContainer>
  );
}
