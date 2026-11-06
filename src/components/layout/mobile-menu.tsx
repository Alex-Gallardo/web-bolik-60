"use client";

import { usePathname } from "next/navigation";
import { useRef, useState, type ComponentType } from "react";
import { retryableImport } from "@/components/feedback/feedback-store";
import { ui } from "@/content/ui";
import type { MobileMenuSheetProps } from "./mobile-menu-sheet";
import type { NavGroup } from "./products-menu";

// El Sheet (Radix Dialog, ~10 KB) no va en el JS de todas las páginas: se descarga al primer
// toque (docs/04) y se precarga al acercar el dedo o el foco al botón.
const loadSheet = retryableImport(() => import("./mobile-menu-sheet"));

type MobileMenuProps = { groups: NavGroup[]; whatsappUrl: string | null };

/**
 * Botón del menú móvil (BD-041, < 1024 px). Abre el Sheet; al navegar se cierra y el foco vuelve a
 * este botón (criterio del ticket). Sin JS, los mismos enlaces están en el footer (BD-042).
 */
export function MobileMenu({ groups, whatsappUrl }: MobileMenuProps) {
  const button = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [Panel, setPanel] = useState<ComponentType<MobileMenuSheetProps> | null>(null);
  const pathname = usePathname();
  const [lastPath, setLastPath] = useState(pathname);
  // Cambió la ruta (atrás, adelante o un enlace): el menú se cierra.
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  const warm = () => void loadSheet().catch(() => {});
  const openMenu = async () => {
    if (!Panel) {
      try {
        const loaded = await loadSheet();
        setPanel(() => loaded.default);
      } catch {
        return; // Sin red: el botón vuelve a intentarlo en el próximo toque.
      }
    }
    setOpen(true);
  };

  return (
    <>
      <button
        ref={button}
        type="button"
        aria-label={ui.header.openMenu}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => void openMenu()}
        onPointerEnter={warm}
        onFocus={warm}
        className="grid size-11 cursor-pointer place-items-center rounded-md text-ink hover:bg-soft lg:hidden"
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
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </button>
      {Panel ? (
        <Panel
          open={open}
          onOpenChange={setOpen}
          returnFocus={() => button.current?.focus()}
          groups={groups}
          whatsappUrl={whatsappUrl}
        />
      ) : null}
    </>
  );
}
