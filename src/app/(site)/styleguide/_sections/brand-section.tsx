import { Illustration, type IllustrationName } from "@/components/brand/illustration";
import { Logo } from "@/components/brand/logo";
import { Section } from "@/components/layout/section";
import { SgSection } from "../_components/sg-section";

/** Dónde se usa cada ilustración (docs/08 §5). */
const ILLUSTRATIONS: [IllustrationName, string][] = [
  ["success", "Envío correcto"],
  ["error", "Error y 404"],
  ["empty", "Cotización vacía"],
  ["no-results", "Búsqueda sin resultados"],
  ["offline", "Sin conexión"],
  ["error-cloud", "Diálogo de error"],
  ["question", "Diálogo de confirmación"],
];

/** 1 · Marca: logo en los fondos permitidos, área libre, favicon e ilustraciones. */
export function BrandSection() {
  return (
    <SgSection id="marca" intro="Logo oficial (docs/02) en los fondos permitidos y su área libre.">
      <div className="grid gap-4 md:grid-cols-3">
        <Section
          as="div"
          background="paper"
          spacing="sm"
          contained={false}
          className="rounded-xl border-2 border-line px-6"
        >
          <div className="flex flex-col gap-4">
            <Logo />
            <p className="text-sm text-muted">Completo, sobre fondo claro</p>
          </div>
        </Section>
        <Section
          as="div"
          background="navy"
          spacing="sm"
          contained={false}
          className="rounded-xl px-6"
        >
          <div className="flex flex-col gap-4">
            <Logo variant="inverse" />
            <p className="text-sm">Negativo, sobre navy</p>
          </div>
        </Section>
        <Section
          as="div"
          background="brand"
          spacing="sm"
          contained={false}
          className="rounded-xl px-6"
        >
          <div className="flex flex-col gap-4">
            <Logo variant="inverse" />
            <p className="text-sm">Negativo, sobre azul</p>
          </div>
        </Section>
      </div>
      <div className="flex flex-wrap items-center gap-8">
        <Logo variant="wordmark" className="text-ink" />
        <Logo variant="wordmark" width={96} className="text-blue" />
        <p className="text-sm text-muted">
          Wordmark en línea, en el color del texto (encabezado, menú, splash). Mínimo 96 px.
        </p>
      </div>
      {/* Área libre (doc 02): la altura de la «B» alrededor; a 120 px de ancho mide 30 px. */}
      <div className="flex flex-col items-start gap-2">
        <div className="border-2 border-dashed border-line-strong p-7.5">
          <Logo variant="wordmark" className="text-ink" />
        </div>
        <span className="text-sm text-muted">Área libre: la altura de la «B»</span>
      </div>
      {/* BD-028: el wordmark en blanco sobre negro que entregó Mercadeo (el logo no tiene isotipo). */}
      <div className="flex flex-wrap items-center gap-6">
        {/* <img> y no next/image: con next/image aquí, Turbopack separa su HeadManagerContext en un
            chunk que todas las páginas precargan (+1 petición; BD-090). Archivos fijos, sin optimizar. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/apple-icon.png"
          alt="Ícono de la pantalla de inicio"
          width={90}
          height={90}
          className="rounded-lg"
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/favicon.ico" alt="Favicon" width={32} height={32} />
        <p className="text-sm text-muted">
          Favicon (16 y 32 px) e ícono de la pantalla de inicio en iPhone (180 px).
        </p>
      </div>
      <h3>Ilustraciones</h3>
      <ul className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
        {ILLUSTRATIONS.map(([name, use]) => (
          <li key={name} className="flex flex-col items-center gap-2 text-center">
            <Illustration name={name} />
            <span className="text-sm text-muted">{use}</span>
          </li>
        ))}
      </ul>
    </SgSection>
  );
}
