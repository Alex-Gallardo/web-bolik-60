"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, type ReactNode } from "react";
import { departmentPath } from "@/features/stores/directory";
import type { MapDepartment, MapStore } from "@/features/stores/nearby";
import { StoreMapLayout, useStoreMapSheet } from "./store-map-layout";

type DepartmentStoresProps = {
  /** El departamento de la página: el mapa lo centra y marca su pin. */
  slug: string;
  /** Todos los departamentos con tiendas (sus pines) y las tiendas verificadas con coordenadas. */
  departments: MapDepartment[];
  stores: MapStore[];
  /** La lista del servidor. */
  children: ReactNode;
};

/**
 * Página de un departamento (BD-082, docs/06 §3.8): la lista del servidor con el mapa de BD-081
 * centrado en él. Tocar el pin de otro departamento lleva a su página. Sin JS, solo la lista.
 */
export function DepartmentStores({ slug, departments, stores, children }: DepartmentStoresProps) {
  const router = useRouter();
  const go = useCallback(
    (next: string) => {
      if (next !== slug) router.push(departmentPath(next) as Route);
    },
    [router, slug],
  );
  const map = useMemo(
    // Zoom 9: el departamento y sus vecinos, para ir a sus páginas.
    () => ({ departments, stores, selected: slug, onSelect: go, zoom: 9 }),
    [departments, stores, slug, go],
  );
  const sheet = useStoreMapSheet(map);

  return (
    <div className="flex flex-col gap-6">
      <div className="js-only lg:hidden">{sheet.button}</div>
      <StoreMapLayout map={map}>{children}</StoreMapLayout>
      {sheet.sheet}
    </div>
  );
}
