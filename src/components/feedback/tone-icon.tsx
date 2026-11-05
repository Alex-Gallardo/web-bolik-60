import type { ToastTone } from "@/content/feedback";

const TONES: Record<ToastTone, { path: string; color: string }> = {
  success: { path: "m7.5 12.5 3 3 6-6.5", color: "text-green" },
  info: { path: "M12 11v6M12 7.5v.01", color: "text-blue" },
  warning: { path: "M12 7v6M12 16.5v.01", color: "text-warning" },
  error: { path: "m8.5 8.5 7 7m0-7-7 7", color: "text-red" },
};

/**
 * Ícono por tono (✓ éxito, i info, ! advertencia, × error) de toasts, avisos inline y el aviso
 * de sin conexión. Sin cx: va en el JS de todas las páginas (FeedbackHost) y cada byte cuenta.
 * Decorativo: siempre va junto a un texto (el color nunca es el único indicador).
 */
export function ToneIcon({ tone, className }: { tone: ToastTone; className?: string }) {
  const { path, color } = TONES[tone];
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      className={`shrink-0 ${color} ${className ?? ""}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d={path} />
    </svg>
  );
}
