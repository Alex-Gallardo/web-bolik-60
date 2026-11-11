import type { Route } from "next";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { ui } from "@/content/ui";
import { HeaderScroll } from "./header-scroll";
import { MobileMenu } from "./mobile-menu";
import { ProductsMenu, type NavGroup } from "./products-menu";
import { QuoteLink } from "./quote-link";

type HeaderProps = {
  /** Categorías por línea, para el menú de Productos (las da el layout desde server/data). */
  groups: NavGroup[];
  /** Enlace de WhatsApp del menú móvil; null si aún no hay número en los ajustes. */
  whatsappUrl: string | null;
};

// Sin salto de línea; padding corto hasta xl: a 1024 px el menú entero cabe en una línea.
const navLink =
  "flex min-h-11 items-center rounded-md px-2 font-bold whitespace-nowrap text-ink no-underline hover:bg-soft xl:px-3";

/**
 * Header del sitio (BD-041, docs/06 §2). Server Component: solo son cliente las islas pequeñas
 * (compactar, menú de Productos, contador y botón del menú móvil). Sticky con altura reservada y
 * compacto al bajar (A-07, sin CLS); nunca se oculta: la cotización queda siempre a mano.
 * Escritorio (≥ 1024 px): logo · menú · Buscar · Mi cotización · Cotizar. Móvil: logo · Buscar ·
 * Mi cotización · menú.
 */
export function Header({ groups, whatsappUrl }: HeaderProps) {
  return (
    <header className="site-header">
      <HeaderScroll />
      <div className="site-header__bar container-site flex h-full items-center gap-2">
        <Link
          href="/"
          aria-label={ui.header.home}
          className="me-2 flex min-h-11 shrink-0 items-center text-ink"
        >
          <Logo variant="wordmark" width={104} />
        </Link>
        <nav aria-label={ui.header.navLabel} className="hidden lg:block">
          <ul className="flex items-center gap-1">
            <li>
              <ProductsMenu groups={groups} />
            </li>
            {ui.header.nav.map((item) => (
              <li key={item.href}>
                <Link href={item.href as Route} prefetch={false} className={navLink}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="ms-auto flex items-center gap-1">
          <Link
            href={ui.header.search.href as Route}
            prefetch={false}
            aria-label={ui.header.search.label}
            className="grid size-11 place-items-center rounded-md text-ink hover:bg-soft"
          >
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              focusable="false"
              className="size-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <circle cx="11" cy="11" r="6.5" />
              <path d="m16 16 4.5 4.5" />
            </svg>
          </Link>
          <QuoteLink />
          {/* El contenedor se oculta en móvil: en el botón, hidden chocaría con su inline-flex. */}
          <div className="ms-2 hidden lg:block">
            {/* md: 44 px o más, también en tablets táctiles (1024–1366 px). */}
            <Button asChild>
              <Link href={ui.header.cta.href as Route} prefetch={false}>
                {ui.header.cta.label}
              </Link>
            </Button>
          </div>
          <MobileMenu groups={groups} whatsappUrl={whatsappUrl} />
        </div>
      </div>
    </header>
  );
}
