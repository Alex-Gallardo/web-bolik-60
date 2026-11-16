"use client";

import WhatsAppSheet from "@/components/whatsapp/whatsapp-sheet";
import { whatsappEventData, whatsappMessage, whatsappUrl, type WhatsAppItem } from "@/lib/whatsapp";

export type ProductWhatsAppSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  returnFocus: () => void;
  /** Número de SiteSetting. */
  phone: string;
  /** Lo elegido en la ficha: nombre con color, SKU, presentación y cantidad. */
  item: WhatsAppItem;
  /** URL absoluta de la ficha con su ?color=. */
  pageUrl: string;
};

/**
 * WhatsApp desde la ficha (BD-062, BD-067): arma el mensaje «product» con lo elegido y abre el
 * WhatsAppSheet. Se descarga al primer toque, con lib/whatsapp.ts y el Sheet.
 */
export default function ProductWhatsAppSheet({
  phone,
  item,
  pageUrl,
  ...sheet
}: ProductWhatsAppSheetProps) {
  const message = whatsappMessage({ context: "product", item, url: pageUrl });
  const url = whatsappUrl(phone, message);
  if (!url) return null;
  return (
    <WhatsAppSheet
      {...sheet}
      message={message}
      url={url}
      eventData={whatsappEventData("product", item.sku)}
    />
  );
}
