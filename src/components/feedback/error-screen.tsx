import { feedback } from "@/content/feedback";

type ErrorScreenProps = {
  /** El valor que llegó al error boundary (`unknown` en Next 16.4). */
  error: unknown;
  retry: () => void;
};

/** Código de un error del servidor (digest de Next), el mismo que queda en el log. */
export function errorReference(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null || !("digest" in error)) return undefined;
  const digest = String((error as { digest: unknown }).digest);
  return digest || undefined;
}

/** Pantalla amigable de error (docs/17 §404 y 500). La usan error.tsx y global-error.tsx. */
export function ErrorScreen({ error, retry }: ErrorScreenProps) {
  const text = feedback.system.genericError;
  const reference = errorReference(error);
  return (
    <section
      role="alert"
      className="container-site flex flex-1 flex-col items-start justify-center gap-4 py-16"
    >
      <h1>{text.title}</h1>
      <p className="max-w-[var(--measure)] text-[length:var(--fs-lead)] text-muted">{text.body}</p>
      <button
        type="button"
        onClick={retry}
        className="press min-h-11 rounded-md bg-blue px-6 font-bold text-paper"
      >
        {text.primary}
      </button>
      {reference && <p className="text-sm text-muted tnum">{text.reference(reference)}</p>}
    </section>
  );
}
