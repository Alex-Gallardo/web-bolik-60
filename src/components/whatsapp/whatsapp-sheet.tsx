"use client";

import { useRef } from "react";
import { showToast } from "@/components/feedback/feedback-store";
import { buttonVariants } from "@/components/ui/button-variants";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { feedback } from "@/content/feedback";
import { whatsappText } from "@/content/whatsapp";
import type { whatsappEventData } from "@/lib/whatsapp-event";

export type WhatsAppSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Devuelve el foco al botón que lo abrió (no hay Trigger de Radix: el botón vive fuera). */
  returnFocus: () => void;
  /** Mensaje prellenado (lib/whatsapp.ts) y su enlace wa.me. */
  message: string;
  url: string;
  /** data-event="whatsapp_open" y su contexto (lib/whatsapp-event.ts), en «Abrir WhatsApp». */
  eventData: ReturnType<typeof whatsappEventData>;
};

/**
 * WhatsAppSheet (docs/08 §2, matriz §4; BD-062): vista previa del mensaje, «Copiar» (toast
 * whatsapp.copied o, si el portapapeles falla, copyFailed con el texto ya seleccionado) y «Abrir
 * WhatsApp». Se descarga al primer toque del botón de WhatsApp: Radix Dialog no va en el JS inicial.
 */
export default function WhatsAppSheet({
  open,
  onOpenChange,
  returnFocus,
  message,
  url,
  eventData,
}: WhatsAppSheetProps) {
  const t = whatsappText.sheet;
  const preview = useRef<HTMLParagraphElement>(null);

  const selectPreview = () => {
    const node = preview.current;
    const selection = window.getSelection();
    if (!node || !selection) return;
    const range = document.createRange();
    range.selectNodeContents(node);
    selection.removeAllRanges();
    selection.addRange(range);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      showToast(feedback.whatsapp.copied);
    } catch {
      selectPreview();
      showToast(feedback.whatsapp.copyFailed);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        title={t.title}
        description={t.description}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          returnFocus();
        }}
        footer={
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => void copy()}
              className={buttonVariants({ variant: "outline", block: true })}
            >
              {t.copy}
            </button>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => onOpenChange(false)}
              className={buttonVariants({ variant: "whatsapp", block: true })}
              {...eventData}
            >
              {t.open}
              <span className="sr-only">{` ${t.newTab}`}</span>
            </a>
          </div>
        }
      >
        <p
          ref={preview}
          data-whatsapp-preview
          className="rounded-lg border-2 border-line bg-soft p-4 break-words whitespace-pre-line select-text"
        >
          {message}
        </p>
      </SheetContent>
    </Sheet>
  );
}
