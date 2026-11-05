"use client";

import { ErrorScreen } from "@/components/feedback/error-screen";

/** Error en una página pública: el layout de (site) se conserva y la pantalla va dentro de su <main> (BD-040). */
export default function SiteError({ error, retry }: { error: unknown; retry: () => void }) {
  return <ErrorScreen error={error} retry={retry} />;
}
