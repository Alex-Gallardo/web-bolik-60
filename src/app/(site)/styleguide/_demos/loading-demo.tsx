"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ui } from "@/content/ui";

/**
 * Estado de carga en la vitrina: dos botones siempre cargando y uno que carga 2 s al presionarlo.
 * `loading` es estado del navegador: el botón solo lo usa en componentes cliente.
 */
export function LoadingDemo() {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!loading) return;
    const timer = setTimeout(() => setLoading(false), 2000);
    return () => clearTimeout(timer);
  }, [loading]);

  return (
    <div className="flex flex-wrap items-center gap-4">
      <Button loading>Enviar cotización</Button>
      <Button loading variant="outline" loadingText={ui.loading.saving}>
        Guardar
      </Button>
      <Button loading={loading} onClick={() => setLoading(true)}>
        Probar envío
      </Button>
    </div>
  );
}
