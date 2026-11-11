import { Splash } from "@/components/layout/splash";
import { ui } from "@/content/ui";
import { rootMetadata } from "@/features/seo/metadata";
import { getSiteSettings } from "@/server/data/content";
import { bricolage, dmSans } from "./fonts";
import { HEAD_SCRIPT } from "./head-script";
import "./globals.css";

export const metadata = rootMetadata;

/**
 * Layout raíz (BD-040, docs/06 §2): español de Guatemala, fuentes, metadatos raíz y el enlace
 * «Saltar al contenido», primero en el orden de tabulación. El splash (BD-043) va al inicio de
 * <body>: decorativo y sin nada enfocable. Cada grupo (site, admin) pone su
 * `<main id="contenido">`.
 */
export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Ajuste del splash (BD-043): el script de <head> lo lee de <html> antes de pintar.
  // Si la fuente de datos falla, sin splash: un ajuste decorativo no tumba /admin ni el 404.
  const splashEnabled = await getSiteSettings().then(
    (settings) => settings.splashEnabled,
    () => false,
  );
  return (
    // suppressHydrationWarning: el script de <head> cambia <html> (clase js, data-splash) antes de hidratar.
    <html
      lang="es-GT"
      className={`${bricolage.variable} ${dmSans.variable} h-full`}
      data-splash-enabled={splashEnabled ? "true" : "false"}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: HEAD_SCRIPT }} />
      </head>
      {/* id="top": destino de «Volver arriba» (BD-042). En el <body> y no en «Saltar al contenido»:
          el navegador enfoca el destino y ese enlace, con foco, pasa a fixed (no habría scroll). */}
      <body id="top" className="flex min-h-full flex-col">
        <Splash />
        <a
          href="#contenido"
          // Relleno solo con foco: sobre sr-only, px/py le ganarían a su padding 0 y el enlace oculto
          // ocuparía espacio.
          className="sr-only rounded-md bg-ink font-bold text-paper no-underline focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-(--z-splash) focus:px-4 focus:py-3"
        >
          {ui.skipToContent}
        </a>
        {children}
      </body>
    </html>
  );
}
