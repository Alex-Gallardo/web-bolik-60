"use client";

import type { Route } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { ui } from "@/content/ui";
import type { NavGroup } from "./products-menu";

export type MobileMenuSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Devuelve el foco al botón del menú (no hay Trigger de Radix: el botón vive fuera). */
  returnFocus: () => void;
  groups: NavGroup[];
  /** Enlace de WhatsApp (wa.me); null mientras no exista el número en los ajustes. */
  whatsappUrl: string | null;
};

/**
 * Menú móvil (BD-041, docs/06 §2): Sheet desde la derecha (A-08) con enlaces grandes, «Cotizar» y
 * WhatsApp. Se descarga al primer toque del botón (mobile-menu.tsx). Cada enlace cierra el menú.
 */
export default function MobileMenuSheet({
  open,
  onOpenChange,
  returnFocus,
  groups,
  whatsappUrl,
}: MobileMenuSheetProps) {
  const close = () => onOpenChange(false);
  const productos = ui.header.products;
  const linkClass =
    "flex min-h-14 items-center rounded-md px-2 text-lg font-bold text-ink no-underline hover:bg-soft";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        title={ui.header.menuTitle}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          returnFocus();
        }}
        footer={
          <div className="flex flex-col gap-3">
            <Button asChild block size="lg" className="w-full">
              <Link href={ui.header.cta.href as Route} prefetch={false} onClick={close}>
                {ui.header.cta.label}
              </Link>
            </Button>
            {whatsappUrl ? (
              <Button asChild variant="whatsapp" size="lg" className="w-full">
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" onClick={close}>
                  {ui.header.whatsapp}
                  <span className="sr-only"> {ui.header.newTab}</span>
                </a>
              </Button>
            ) : null}
          </div>
        }
      >
        <nav aria-label={ui.header.navLabel}>
          <ul className="flex flex-col gap-1">
            <li>
              <Link
                href={productos.href as Route}
                prefetch={false}
                onClick={close}
                className={linkClass}
              >
                {productos.label}
              </Link>
              <div className="mb-2 flex flex-col gap-3 ps-4">
                {groups.map((group) => (
                  <div key={group.line}>
                    <p className="px-2 eyebrow text-blue">{ui.lines[group.line]}</p>
                    <ul className="flex flex-col">
                      {group.categories.map((category) => (
                        <li key={category.href}>
                          <Link
                            href={category.href as Route}
                            prefetch={false}
                            onClick={close}
                            className="flex min-h-11 items-center rounded-md px-2 text-ink no-underline hover:bg-soft"
                          >
                            {category.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </li>
            {ui.header.nav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href as Route}
                  prefetch={false}
                  onClick={close}
                  className={linkClass}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
