"use client";

import { buttonVariants } from "@/components/ui/button-variants";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { catalogPage } from "@/content/catalog";
import type { CatalogFilters, FilterKey } from "@/features/catalog/filters";
import { FilterGroups, type FilterOptions } from "./catalog-filter-groups";

export type CatalogFiltersSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Devuelve el foco al botón «Filtros» (vive fuera del Sheet: no hay Trigger de Radix). */
  returnFocus: () => void;
  options: FilterOptions;
  filters: CatalogFilters;
  onToggle: (key: FilterKey, value: string) => void;
  /** Productos que quedan con los filtros actuales: el botón los cuenta en vivo. */
  visible: number;
};

/**
 * Filtros en móvil (docs/06 §3.2, A-32): Sheet con los grupos y «Ver N productos», que cuenta en
 * vivo. Se descarga al primer toque del botón «Filtros» (catalog-filters.tsx): Radix no va en el
 * JS inicial del catálogo.
 */
export default function CatalogFiltersSheet({
  open,
  onOpenChange,
  returnFocus,
  options,
  filters,
  onToggle,
  visible,
}: CatalogFiltersSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="auto"
        title={catalogPage.filters.sheetTitle}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          returnFocus();
        }}
        footer={
          <button
            type="button"
            className={buttonVariants({ variant: "primary", block: true })}
            onClick={() => onOpenChange(false)}
          >
            {catalogPage.filters.apply(visible)}
          </button>
        }
      >
        {/* El Sheet modal oculta el resto de la página (y su contador): el conteo se anuncia aquí. */}
        <p aria-live="polite" className="sr-only">
          {catalogPage.count(visible)}
        </p>
        <FilterGroups options={options} filters={filters} onToggle={onToggle} layout="column" />
      </SheetContent>
    </Sheet>
  );
}
