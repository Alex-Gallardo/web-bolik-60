import { Skeleton } from "@/components/ui/skeleton";

/**
 * Lugar de una ProductCard mientras carga en el cliente (buscador, filtros): mismo marco, mismo
 * cuadro 1:1 y mismas alturas de línea, así el cambio a la tarjeta real no mueve nada (CLS 0):
 * chip 24 px (text-xs + py-0.5 + borde de 2 px), título text-lg leading-tight (1.40625rem),
 * colores text-sm (20 px) y «Ver producto» con su mt-auto pt-2.
 */
export function ProductCardSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="flex h-full flex-col rounded-lg border-2 border-line bg-paper"
    >
      <Skeleton className="aspect-square rounded-t-[calc(var(--radius-lg)-2px)] rounded-b-none" />
      <div className="flex flex-1 flex-col gap-2 p-4">
        <Skeleton className="h-6 w-24 rounded-full" />
        <Skeleton className="h-[1.40625rem] w-3/4" />
        <Skeleton className="h-5 w-1/2" />
        <div className="mt-auto pt-2">
          <Skeleton className="h-5 w-28" />
        </div>
      </div>
    </div>
  );
}
