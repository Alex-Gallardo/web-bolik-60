import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { ui } from "@/content/ui";
import { formatPhone, toInternationalPhone } from "@/lib/format";
import type { StoreView } from "@/server/data/types";

/**
 * Enlace a Google Maps para llegar (docs/06 §3.7). Con datos verificados por Ventas: coordenadas
 * o, si no hay, nombre y dirección. Sin verificar, la dirección no se muestra ni se usa: el mapa
 * busca la tienda por nombre y lugar (Google la encuentra si existe).
 */
export function directionsUrl(store: StoreView): string {
  const base = "https://www.google.com/maps/dir/?api=1&destination=";
  if (store.isVerified && store.lat !== null && store.lng !== null)
    return `${base}${store.lat},${store.lng}`;
  const place = [
    store.name,
    store.isVerified ? store.address : null,
    store.municipality,
    store.department.name,
    "Guatemala",
  ]
    .filter(Boolean)
    .join(", ");
  return `${base}${encodeURIComponent(place)}`;
}

/** Solo enlaces https a la tienda en línea (el dato viene del admin). */
function safeShopUrl(url: string | null): string | null {
  return url && url.startsWith("https://") ? url : null;
}

type StoreCardProps = { store: StoreView; headingLevel?: 2 | 3 | 4 };

/**
 * Tarjeta de tienda (docs/06 §3.7, BD-023): nombre, tipo, lugar, dirección (solo si está
 * verificada) y teléfono, con las acciones «Cómo llegar», «Llamar» y «Comprar en línea» (doc 17
 * §4). No es un solo enlace: tiene varias acciones; las que no tienen dato no se muestran. Cada
 * acción dice a qué tienda va para el lector de pantalla, y las externas avisan la pestaña nueva.
 */
export function StoreCard({ store, headingLevel = 3 }: StoreCardProps) {
  const Heading = `h${headingLevel}` as const;
  const phone = store.phone ? toInternationalPhone(store.phone) : null;
  const shop = safeShopUrl(store.onlineShopUrl);
  const address = store.isVerified ? store.address : null;
  const place = [store.municipality, store.department.name].filter(Boolean).join(", ");

  return (
    <article className="flex h-full flex-col gap-3 rounded-lg border-2 border-line bg-paper p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <Heading className="text-lg leading-tight">{store.name}</Heading>
        <Chip>{ui.cards.storeTypes[store.type]}</Chip>
      </div>
      <p className="text-sm text-muted">
        {address ? (
          <>
            {address}
            <br />
          </>
        ) : null}
        {place}
      </p>
      {store.phone ? <p className="text-sm">{formatPhone(store.phone)}</p> : null}
      {store.isVerified ? null : <p className="text-xs text-muted">{ui.cards.unverified}</p>}
      <div className="mt-auto flex flex-wrap gap-x-5 pt-1">
        <Button asChild variant="link" size="sm">
          <a href={directionsUrl(store)} target="_blank" rel="noopener noreferrer">
            {ui.cards.directions}{" "}
            <span className="sr-only">{`${ui.cards.toStore(store.name)} ${ui.cards.newTab}`}</span>
          </a>
        </Button>
        {phone ? (
          <Button asChild variant="link" size="sm">
            <a href={`tel:+${phone}`}>
              {ui.cards.call} <span className="sr-only">{ui.cards.toStore(store.name)}</span>
            </a>
          </Button>
        ) : null}
        {shop ? (
          <Button asChild variant="link" size="sm">
            <a href={shop} target="_blank" rel="noopener noreferrer">
              {ui.cards.buyOnline}{" "}
              <span className="sr-only">{`${ui.cards.inStore(store.name)} ${ui.cards.newTab}`}</span>
            </a>
          </Button>
        ) : null}
      </div>
    </article>
  );
}
