import { ChipToggle } from "@/components/ui/chip";
import { catalogPage } from "@/content/catalog";
import type { CatalogFilters, FilterKey } from "@/features/catalog/filters";
import type { LineGroup } from "@/server/data/types";

export type FilterOptions = {
  linea: { slug: LineGroup; name: string }[];
  uso: { slug: string; name: string }[];
  color: { slug: string; name: string; hex: string }[];
};

type FilterGroupsProps = {
  options: FilterOptions;
  filters: CatalogFilters;
  onToggle: (key: FilterKey, value: string) => void;
  /** En el sheet de móvil van en columna; en la barra de escritorio, en fila. */
  layout: "row" | "column";
};

/**
 * Los tres grupos de filtros (línea, uso, color) como chips seleccionables (ChipToggle, con
 * aria-pressed). Los usan la barra de escritorio y el sheet de móvil. Un grupo sin opciones no se
 * dibuja (por ejemplo, Color cuando ningún producto tiene variantes de color).
 */
export function FilterGroups({ options, filters, onToggle, layout }: FilterGroupsProps) {
  const groups = (["linea", "uso", "color"] as const).filter((key) => options[key].length > 0);
  return (
    <div className={layout === "row" ? "flex flex-wrap gap-x-6 gap-y-3" : "flex flex-col gap-6"}>
      {groups.map((key) => {
        const labelId = `filtro-${layout}-${key}`;
        return (
          <div
            key={key}
            role="group"
            aria-labelledby={labelId}
            className="flex flex-wrap items-center gap-2"
          >
            <span id={labelId} className="w-full text-sm font-bold text-heading lg:w-auto">
              {catalogPage.filters.groups[key]}
            </span>
            {key === "linea"
              ? options.linea.map((option) => (
                  <ChipToggle
                    key={option.slug}
                    line={option.slug}
                    pressed={filters.linea === option.slug}
                    onClick={() => onToggle("linea", option.slug)}
                  >
                    {option.name}
                  </ChipToggle>
                ))
              : null}
            {key === "uso"
              ? options.uso.map((option) => (
                  <ChipToggle
                    key={option.slug}
                    line="neutral"
                    pressed={filters.uso === option.slug}
                    onClick={() => onToggle("uso", option.slug)}
                  >
                    {option.name}
                  </ChipToggle>
                ))
              : null}
            {key === "color"
              ? options.color.map((option) => (
                  <ChipToggle
                    key={option.slug}
                    line="neutral"
                    pressed={filters.color === option.slug}
                    onClick={() => onToggle("color", option.slug)}
                  >
                    <span
                      aria-hidden="true"
                      className="me-1.5 inline-block size-3 rounded-full align-[-1px] ring-1 ring-line-strong"
                      style={{ backgroundColor: option.hex }}
                    />
                    {option.name}
                  </ChipToggle>
                ))
              : null}
          </div>
        );
      })}
    </div>
  );
}
