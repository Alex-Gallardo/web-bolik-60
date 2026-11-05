import { ui } from "@/content/ui";
import { rootMetadata } from "@/features/seo/metadata";
import { bricolage, dmSans } from "./fonts";
import { HEAD_SCRIPT } from "./head-script";
import "./globals.css";

export const metadata = rootMetadata;

/**
 * Layout raíz (BD-040, docs/06 §2): español de Guatemala, fuentes, metadatos raíz y el enlace
 * «Saltar al contenido», primero en el orden de tabulación. Cada grupo (site, admin) pone su
 * `<main id="contenido">`.
 */
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: el script de <head> cambia la clase de <html> antes de hidratar.
    <html
      lang="es-GT"
      className={`${bricolage.variable} ${dmSans.variable} h-full`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: HEAD_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col">
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
