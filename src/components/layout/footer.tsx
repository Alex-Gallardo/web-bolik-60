import { cx } from "class-variance-authority";
import type { Route } from "next";
import { cacheLife } from "next/cache";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { footerText } from "@/content/footer";
import { ui } from "@/content/ui";
import { formatPhone, toInternationalPhone } from "@/lib/format";

export type FooterLink = { label: string; href: string };

export type FooterProps = {
  /** Todas las categorías publicadas (docs/10: el pie enlaza cada categoría). */
  categories: { name: string; href: string }[];
  /** Datos de la empresa desde SiteSetting: el mismo NAP que /contacto y el JSON-LD. */
  legalName: string;
  address: string;
  phone: string;
  businessHours: string;
  /** Página de Facebook; null = sin enlace. */
  facebookUrl: string | null;
  /** Con los kits activos, «Familias» lleva a /kits-escolares; si no, a /donde-comprar. */
  kitsEnabled: boolean;
};

/**
 * Año del © en hora de Guatemala. Con Cache Components `new Date()` no se lee suelto al
 * prerenderizar: va en caché y se renueva una vez al día (la página se regenera sola en enero).
 */
async function currentYear(): Promise<number> {
  "use cache";
  cacheLife("days");
  const year = new Intl.DateTimeFormat("en", {
    year: "numeric",
    timeZone: "America/Guatemala",
  }).format(new Date());
  return Number(year);
}

const linkClass =
  "inline-flex min-h-11 items-center text-on-dark no-underline hover:text-paper hover:underline";

function LinkColumn({ title, links }: { title: string; links: readonly FooterLink[] }) {
  return (
    <div>
      <h2 className="mb-2 eyebrow text-yellow">{title}</h2>
      <ul>
        {links.map((link) => (
          <li key={link.href}>
            {/* Sin precarga: varias rutas llegan con sus tickets (igual que el header). */}
            <Link href={link.href as Route} prefetch={false} className={linkClass}>
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Pie del sitio (BD-042, docs/06 §2 y docs/17 §1). Server Component sin JS: marca, columnas de
 * enlaces (categorías, públicos, Bolik, legal), datos de la empresa con teléfono `tel:` y la fila
 * del ©. Reserva abajo el alto de los flotantes (floating-actions.tsx) para que nunca tapen el
 * final de la página.
 */
export async function Footer({
  categories,
  legalName,
  address,
  phone,
  businessHours,
  facebookUrl,
  kitsEnabled,
}: FooterProps) {
  const year = await currentYear();
  const footer = footerText;
  const telNumber = toInternationalPhone(phone);
  const forYou: FooterLink[] = [
    { label: footer.forYou.families, href: kitsEnabled ? "/kits-escolares" : "/donde-comprar" },
    ...footer.forYou.links,
  ];
  const products: FooterLink[] = [
    ...categories.map(({ name, href }) => ({ label: name, href })),
    footer.products.all,
  ];

  return (
    <footer className="site-footer bg-navy text-on-dark">
      <div className="container-site grid gap-10 pt-12 pb-8 md:grid-cols-2 lg:grid-cols-[1.4fr_repeat(4,1fr)] lg:gap-8 lg:pt-16">
        <div className="flex flex-col gap-4 md:col-span-2 lg:col-span-1">
          <Logo variant="inverse" width={150} />
          <p className="text-lg text-paper">{footer.tagline}</p>
          <p className="text-sm text-on-dark-muted">{footer.group}</p>
          <address className="flex flex-col gap-1 text-sm not-italic">
            <span className="font-bold text-paper">{legalName}</span>
            <span>{address}</span>
            {telNumber ? (
              <a
                href={`tel:+${telNumber}`}
                aria-label={footer.call(formatPhone(phone))}
                className={cx(linkClass, "tnum")}
              >
                {formatPhone(phone)}
              </a>
            ) : (
              <span>{phone}</span>
            )}
            <span>{businessHours}</span>
            {facebookUrl ? (
              <a
                href={facebookUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={cx(linkClass, "gap-2")}
              >
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  focusable="false"
                  className="size-5"
                  fill="currentColor"
                >
                  <path d="M13.5 21v-7.5H16l.5-3h-3V8.6c0-.9.3-1.6 1.6-1.6h1.6V4.3a21 21 0 0 0-2.4-.1c-2.4 0-4 1.4-4 4.1v2.2H7.6v3h2.7V21z" />
                </svg>
                {footer.facebook}
                <span className="sr-only"> {ui.header.newTab}</span>
              </a>
            ) : null}
          </address>
        </div>
        <LinkColumn title={footer.products.title} links={products} />
        <LinkColumn title={footer.forYou.title} links={forYou} />
        <LinkColumn title={footer.bolik.title} links={footer.bolik.links} />
        <LinkColumn title={footer.legal.title} links={footer.legal.links} />
      </div>
      <div className="border-t border-navy-700">
        <div className="container-site flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-4 text-sm text-on-dark-muted">
          <p>{footer.copyright(year)}</p>
          <a href="#top" className={linkClass}>
            {footer.backToTop}
          </a>
        </div>
      </div>
    </footer>
  );
}
