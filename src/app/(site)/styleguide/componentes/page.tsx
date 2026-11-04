import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LoadingDemo } from "./loading-demo";

/**
 * Vitrina interna de componentes (BD-021…BD-025): cada ticket agrega aquí sus piezas reales.
 * BD-026 la integra al /styleguide completo.
 */
export const metadata: Metadata = {
  title: "Componentes · Styleguide",
  robots: { index: false, follow: false },
};

/** Flecha de ejemplo para los íconos (Lucide llega con los íconos del sitio). */
function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
      <path
        d="M5 12h14m-6-6 6 6-6 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function ComponentesPage() {
  return (
    <div className="container-site flex flex-col gap-16 py-16">
      <header className="flex flex-col gap-2">
        <p className="eyebrow text-blue">Styleguide</p>
        <h1>Componentes</h1>
        <p className="text-muted">Las piezas reales del sitio, en todos sus estados.</p>
      </header>

      <section className="flex flex-col gap-8" aria-labelledby="botones">
        <h2 id="botones">Botones</h2>

        <div className="flex flex-col gap-4">
          <h3>Sobre fondo claro</h3>
          <div className="flex flex-wrap items-center gap-4">
            <Button>Cotizar</Button>
            <Button variant="dark">Ver ficha</Button>
            <Button variant="outline">Dónde comprar</Button>
            <Button variant="whatsapp">Escríbenos por WhatsApp</Button>
            <Button variant="danger">Descartar</Button>
            <Button variant="link">Ver todas las tiendas</Button>
          </div>
        </div>

        <div className="flex flex-col gap-4 rounded-xl bg-navy p-6 text-paper">
          <h3 className="text-paper">Sobre fondo oscuro</h3>
          <div className="flex flex-wrap items-center gap-4">
            <Button variant="accent">Cotizar por mayor</Button>
            <Button variant="ghost-light">Ser distribuidor</Button>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <h3>Tamaños</h3>
          <div className="flex flex-wrap items-center gap-4">
            <Button size="sm">Pequeño (admin)</Button>
            <Button>Mediano</Button>
            <Button size="lg">Grande</Button>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <h3>Con ícono y como enlace</h3>
          <div className="flex flex-wrap items-center gap-4">
            <Button asChild endIcon={<ArrowIcon />}>
              <Link href="/styleguide/datos">Ver los datos</Link>
            </Button>
            <Button variant="outline" startIcon={<ArrowIcon />}>
              Con ícono inicial
            </Button>
            <Button disabled>Deshabilitado</Button>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <h3>Cargando</h3>
          <LoadingDemo />
        </div>

        <div className="flex flex-col gap-4">
          <h3>Ancho completo en móvil</h3>
          <Button block size="lg">
            Enviar cotización
          </Button>
        </div>
      </section>
    </div>
  );
}
