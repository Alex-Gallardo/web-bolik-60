import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SgSection } from "../_components/sg-section";
import { LoadingDemo } from "../_demos/loading-demo";

/** Flecha de ejemplo para los íconos. */
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

/** 6 · Botones: variantes × tamaños × estados (cargando y deshabilitado incluidos). */
export function ButtonsSection() {
  return (
    <SgSection id="botones" intro="Variantes, tamaños y estados. Con el teclado se ve el foco.">
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
        <h3>Con ícono, como enlace y deshabilitado</h3>
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
    </SgSection>
  );
}
