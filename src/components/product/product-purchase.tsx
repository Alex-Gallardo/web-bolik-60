"use client";

import { cx } from "class-variance-authority";
import type { Route } from "next";
import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ComponentType,
  type MouseEvent,
} from "react";
import { createPortal } from "react-dom";
import { retryableImport } from "@/components/feedback/feedback-store";
import { buttonVariants } from "@/components/ui/button-variants";
import { QuantityStepper } from "@/components/ui/quantity-stepper";
import { purchaseText as t } from "@/content/product-purchase";
import { openQuoteDrawer } from "@/features/quote/storage-keys";
import type { PackagingCode } from "@/lib/constants";
import type { ProductWhatsAppSheetProps } from "./product-whatsapp-sheet";

// zustand, el store y los textos de feedback.ts se descargan al primer «Agregar»; el Sheet de
// WhatsApp (Radix Dialog) y lib/whatsapp.ts, al primer toque de WhatsApp (docs/12 §2).
const loadAdd = retryableImport(() => import("./add-to-quote"));
const loadSheet = retryableImport(() => import("./product-whatsapp-sheet"));

const noop = () => () => {};

/** Cantidades sugeridas para las presentaciones por mayor (docs/07 §3: cajillas 5, 10, 20, 50). */
const SUGGESTED = [5, 10, 20, 50] as const;

export type PurchaseVariant = {
  sku: string;
  colorKey: string;
  colorName: string;
  hex: string;
  /** Lo que anuncia la región viva al elegirlo: feedback.catalog.colorChanged. */
  announce: string;
  /** Ruta base de su foto principal, para la línea de la cotización. */
  image: string | null;
  isDefault: boolean;
};

export type PurchasePack = {
  code: PackagingCode;
  /** «Cajilla de 12» (Packaging.name). */
  name: string;
  /** «12 unidades». */
  unitsLabel: string;
  units: number;
  /** «¿Cuántas cajillas de 12 necesitas?» (docs/17 §3). */
  question: string;
  singular: string;
  plural: string;
  wholesale: boolean;
};

type ProductPurchaseProps = {
  /** id del contenedor de la ficha ([data-ficha]): marca el cambio de color para el fundido. */
  fichaId: string;
  productName: string;
  /** Ruta de la ficha sin parámetros. */
  href: string;
  /** URL pública del sitio, para el enlace del mensaje de WhatsApp. */
  siteUrl: string;
  variants: PurchaseVariant[];
  packagings: PurchasePack[];
  defaultPack: PackagingCode | null;
  /** Número de SiteSetting y enlace wa.me con el color por defecto (sin JS); null = sin botón. */
  whatsappPhone: string | null;
  whatsappHref: string | null;
  whereToBuy: { label: string; href: string };
  /** Script previo al pintado con ?color= (features/catalog/variant-color.ts); null con un color. */
  prepaintScript: string | null;
};

function WhatsAppIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 20l1.3-3.9A8 8 0 1 1 8 19z" />
      <path d="M9 9.5c.3 2 2.5 4.2 4.5 4.5" />
    </svg>
  );
}

/**
 * Compra de la ficha (docs/06 §3.4, BD-062): color, presentación, cantidad con el total de
 * unidades, «Agregar a mi cotización», «Dónde comprar» y WhatsApp con contexto; en móvil, la barra
 * de abajo cambia a «Agregar a cotización» + WhatsApp.
 *
 * Los radios son nativos y sin controlar: el color elegido cambia la galería, el código y el
 * código de barras con CSS (variantStyles en la página), sin JS y sin recargar. El script previo al
 * pintado puede marcar otro color (?color=) antes de hidratar; al montar, la isla lee el radio
 * marcado. Elegir un color cambia la URL (?color=, replaceState) y lo anuncia (aria-live).
 */
export function ProductPurchase({
  fichaId,
  productName,
  href,
  siteUrl,
  variants,
  packagings,
  defaultPack,
  whatsappPhone,
  whatsappHref,
  whereToBuy,
  prepaintScript,
}: ProductPurchaseProps) {
  // En el servidor y al hidratar, false: el portal de la barra se monta justo después.
  const hydrated = useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
  const root = useRef<HTMLDivElement>(null);
  const whatsappButton = useRef<HTMLAnchorElement | null>(null);
  const defaultVariant = variants.find((v) => v.isDefault) ?? variants[0]!;
  const [colorKey, setColorKey] = useState(defaultVariant.colorKey);
  const [packCode, setPackCode] = useState(defaultPack);
  const [quantity, setQuantity] = useState(1);
  const [announcement, setAnnouncement] = useState("");
  const [busy, setBusy] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [Sheet, setSheet] = useState<ComponentType<ProductWhatsAppSheetProps> | null>(null);

  const variant = variants.find((v) => v.colorKey === colorKey) ?? defaultVariant;
  const pack = packagings.find((p) => p.code === packCode) ?? null;
  const multiColor = variants.length > 1;
  const path = multiColor ? `${href}?color=${variant.colorKey}` : href;

  // El color con el que pintó la página: por defecto o el de ?color=, que marca el script previo al
  // pintado. Llegando por un enlace del sitio (navegación en el cliente) ese script no corre: aquí
  // se marca el radio de ?color= si existe.
  useEffect(() => {
    const radios = [
      ...(root.current?.querySelectorAll<HTMLInputElement>('input[name="color"]') ?? []),
    ];
    const wanted = new URLSearchParams(window.location.search).get("color");
    const fromUrl = radios.find((radio) => radio.value === wanted);
    if (fromUrl) fromUrl.checked = true;
    const checked = radios.find((radio) => radio.checked);
    if (checked) setColorKey(checked.value);
  }, []);

  const chooseColor = (next: PurchaseVariant) => {
    setColorKey(next.colorKey);
    setAnnouncement(next.announce);
    // El fundido de la galería (A-31) solo al cambiar, nunca en el primer pintado.
    document.getElementById(fichaId)?.setAttribute("data-color-changed", "");
    const { pathname, hash } = window.location;
    const params = new URLSearchParams(window.location.search);
    params.set("color", next.colorKey);
    // null: así el router de Next sincroniza su estado con la URL (como los filtros, BD-060).
    window.history.replaceState(null, "", `${pathname}?${params}${hash}`);
  };

  const unit = (n: number) => (pack ? (n === 1 ? pack.singular : pack.plural) : t.unit(n));

  const add = async () => {
    if (busy) return;
    setBusy(true);
    let loaded: Awaited<ReturnType<typeof loadAdd>>;
    try {
      loaded = await loadAdd();
    } catch {
      // Archivos de otro despliegue: recargar trae los nuevos (como el menú móvil). Sin red, el
      // aviso de sin conexión ya está en pantalla y el próximo toque reintenta. Solo la descarga:
      // un error del store no recarga (con localStorage bloqueado, la lista vive en memoria).
      if (navigator.onLine) window.location.reload();
      setBusy(false);
      return;
    }
    try {
      loaded.addToQuote({
        type: "variante",
        ref: variant.sku,
        name: productName,
        detail: `${variant.colorName} · ${variant.sku}`,
        packaging: pack?.code,
        quantity,
        image: variant.image ?? undefined,
        url: path,
        displayName: multiColor ? `${productName} ${variant.colorName}` : productName,
        unit,
        onView: openQuoteDrawer,
      });
    } finally {
      setBusy(false);
    }
  };

  const openWhatsApp = async (event: MouseEvent<HTMLAnchorElement>) => {
    if (!whatsappPhone || !whatsappHref) return;
    event.preventDefault();
    whatsappButton.current = event.currentTarget;
    if (!Sheet) {
      try {
        const loaded = await loadSheet();
        setSheet(() => loaded.default);
      } catch {
        window.open(whatsappHref, "_blank", "noopener,noreferrer");
        return;
      }
    }
    setSheetOpen(true);
  };

  const addButton = (label: string, className?: string) => (
    <button
      type="button"
      onClick={() => void add()}
      aria-busy={busy || undefined}
      data-event="quote_add"
      data-sku={variant.sku}
      className={cx(buttonVariants({ variant: "primary", block: true }), className)}
    >
      {label}
    </button>
  );

  const whatsappLink = (label: string, className?: string) =>
    whatsappHref ? (
      <a
        href={whatsappHref}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(event) => void openWhatsApp(event)}
        aria-haspopup="dialog"
        className={cx(buttonVariants({ variant: "whatsapp", block: true }), className)}
      >
        <WhatsAppIcon />
        {label}
        <span className="sr-only">{` ${t.newTab}`}</span>
      </a>
    ) : null;

  return (
    <div ref={root} className="flex flex-col gap-6">
      {multiColor ? (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-[0.9375rem] font-bold text-ink">{t.colorLegend}</legend>
          <div className="flex flex-wrap gap-2">
            {variants.map((v) => (
              <label
                key={v.colorKey}
                className="swatch flex min-h-11 cursor-pointer items-center gap-2 rounded-full border-2 border-line bg-paper py-1 ps-1.5 pe-4 has-checked:border-blue has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ink"
              >
                <input
                  type="radio"
                  name="color"
                  value={v.colorKey}
                  defaultChecked={v.isDefault}
                  onChange={() => chooseColor(v)}
                  data-color-input
                  data-event="color_select"
                  data-sku={v.sku}
                  className="sr-only"
                />
                <span
                  aria-hidden="true"
                  className="swatch-dot size-8 rounded-full border-2 border-line-strong"
                  style={{ backgroundColor: v.hex }}
                />
                <span className="flex flex-col leading-tight">
                  <span className="font-bold">{v.colorName}</span>
                  <span className="text-xs text-muted">{v.sku}</span>
                </span>
              </label>
            ))}
          </div>
          <p aria-live="polite" className="sr-only">
            {announcement}
          </p>
        </fieldset>
      ) : null}
      {/* Después de los radios: con ?color= marca el suyo antes del primer pintado. Solo en el HTML
          del servidor y al hidratar, como PrepaintScript (aquí con la bandera de la isla: la
          ficha está en su tope de JS); en una navegación lo hace el efecto de arriba. */}
      {prepaintScript && !hydrated ? (
        <script dangerouslySetInnerHTML={{ __html: prepaintScript }} />
      ) : null}

      {packagings.length > 0 ? (
        <fieldset className="flex flex-col">
          <legend className="mb-2 text-[0.9375rem] font-bold text-ink">{t.packLegend}</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {packagings.map((p) => (
              <label
                key={p.code}
                className="flex min-h-11 cursor-pointer flex-col justify-center rounded-md border-2 border-line bg-paper px-3 py-2 has-checked:border-blue has-checked:bg-blue-50 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ink"
              >
                <input
                  type="radio"
                  name="packaging"
                  value={p.code}
                  defaultChecked={p.code === defaultPack}
                  onChange={() => setPackCode(p.code)}
                  data-event="pack_select"
                  data-pack={p.code}
                  className="sr-only"
                />
                <span className="font-bold">{p.name}</span>
                <span className="text-xs text-muted">{p.unitsLabel}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

      <div className="js-only flex flex-col gap-2">
        <label htmlFor={`${fichaId}-cantidad`} className="text-[0.9375rem] font-bold text-ink">
          {pack?.question ?? t.unitsQuestion}
        </label>
        <QuantityStepper id={`${fichaId}-cantidad`} value={quantity} onChange={setQuantity} />
        {pack?.wholesale ? (
          <div role="group" aria-label={t.suggestedLabel} className="flex flex-wrap gap-2">
            {SUGGESTED.map((n) => (
              <button
                key={n}
                type="button"
                aria-pressed={quantity === n}
                aria-label={t.suggested(n)}
                onClick={() => setQuantity(n)}
                className="min-h-11 min-w-11 cursor-pointer rounded-full border-2 border-line bg-paper px-3 font-bold aria-pressed:border-blue aria-pressed:bg-blue-50"
              >
                {n}
              </button>
            ))}
          </div>
        ) : null}
        <p aria-live="polite" className="text-sm font-bold text-muted">
          {t.total(quantity * (pack?.units ?? 1))}
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <div className="js-only flex flex-col">{addButton(t.add)}</div>
        <Link
          href={whereToBuy.href as Route}
          prefetch={false}
          className={buttonVariants({ variant: "outline", block: true })}
        >
          {whereToBuy.label}
        </Link>
        {whatsappLink(t.whatsapp)}
      </div>

      {/* Barra de abajo en móvil (docs/06 §3.4): reemplaza a la del sitio (motion.css). Va en
          <body> con un portal: dentro de la página, la entrada A-02 (transform) la movería, y
          así queda al final del orden de tabulación, como la del sitio. Solo con JS. */}
      {hydrated
        ? createPortal(
            <div
              role="group"
              aria-label={t.barLabel}
              className="floating-item mobile-bar product-bar"
            >
              {/* «Agregar a cotización» es más largo: a 360 px cabe en una línea con 3/5 del ancho. */}
              {addButton(t.addShort, "flex-[3] px-3!")}
              {whatsappLink(t.whatsappShort, "flex-[2] px-3!")}
            </div>,
            document.body,
          )
        : null}

      {Sheet && whatsappPhone ? (
        <Sheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          returnFocus={() => whatsappButton.current?.focus()}
          phone={whatsappPhone}
          item={{
            name: multiColor ? `${productName} ${variant.colorName}` : productName,
            sku: variant.sku,
            packaging: pack?.name.toLowerCase(),
            quantity,
          }}
          pageUrl={new URL(path, siteUrl).toString()}
        />
      ) : null}
    </div>
  );
}
