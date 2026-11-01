"use client";

import { ErrorScreen } from "@/components/feedback/error-screen";

/** Error en una página pública: el header y el footer del sitio siguen visibles. */
export default function SiteError({ error, retry }: { error: unknown; retry: () => void }) {
  return <ErrorScreen error={error} retry={retry} />;
}
