import { cx } from "class-variance-authority";
import type { ToastTone } from "@/content/feedback";
import { ToneIcon } from "./tone-icon";

const BOX: Record<ToastTone, string> = {
  success: "border-green bg-green-50",
  info: "border-blue bg-blue-50",
  warning: "border-warning bg-warning-bg",
  error: "border-red bg-red-50",
};

type InlineAlertProps = {
  tone: ToastTone;
  title: string;
  description?: string;
  className?: string;
};

/**
 * Aviso dentro de la página (docs/08 §4, inline): ícono por tono más texto en tinta (el color no
 * es el único indicador; el texto va en ink para el contraste AA sobre los fondos claros). Es
 * estático: si aparece por una acción, quien lo usa lo anuncia (FeedbackHost o aria-live propio).
 */
export function InlineAlert({ tone, title, description, className }: InlineAlertProps) {
  return (
    <div
      className={cx(
        "flex items-start gap-3 rounded-md border-s-4 p-4 text-ink",
        BOX[tone],
        className,
      )}
    >
      <ToneIcon tone={tone} className="mt-0.5 size-5" />
      <div className="flex flex-col gap-0.5">
        <p className="font-bold">{title}</p>
        {description ? <p className="text-sm">{description}</p> : null}
      </div>
    </div>
  );
}
