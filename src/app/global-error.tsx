"use client";

import { ErrorScreen } from "@/components/feedback/error-screen";
import { feedback } from "@/content/feedback";
import { bricolage, dmSans } from "./fonts";
import "./globals.css";

/**
 * Error en el layout raíz: reemplaza todo el documento, por eso trae su propio <html>, estilos y
 * fuentes. Sin `metadata` (es Client Component): el título va con <title>.
 */
export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  return (
    <html lang="es-GT" className={`${bricolage.variable} ${dmSans.variable} h-full`}>
      <body className="flex min-h-full flex-col">
        <title>{`${feedback.system.genericError.title} · Bolik`}</title>
        <main className="flex flex-1 flex-col">
          <ErrorScreen error={error} retry={retry} />
        </main>
      </body>
    </html>
  );
}
