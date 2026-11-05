import type { Metadata } from "next";
import Link from "next/link";
import { Illustration, type IllustrationName } from "@/components/brand/illustration";
import { Logo } from "@/components/brand/logo";
import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { Button } from "@/components/ui/button";
import { BACKGROUND_PRESETS, type BackgroundPreset } from "@/lib/constants";
import { CategoryCard } from "@/components/catalog/category-card";
import { ProductCard } from "@/components/catalog/product-card";
import { ProductCardSkeleton } from "@/components/catalog/product-card-skeleton";
import { AudienceCard } from "@/components/home/audience-card";
import { StoreCard } from "@/components/stores/store-card";
import { Badge } from "@/components/ui/badge";
import { Chip, ChipToggle } from "@/components/ui/chip";
import { audiences } from "@/content/home";
import { ui } from "@/content/ui";
import { listCategories, listProducts } from "@/server/data/catalog";
import { listDepartments, listStores } from "@/server/data/stores";
import { FormDemo } from "./form-demo";
import { LoadingDemo } from "./loading-demo";

/**
 * Vitrina interna de componentes (BD-020…BD-025): cada ticket agrega aquí sus piezas reales.
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

/** Dónde se usa cada ilustración (docs/08 §5). */
const ILLUSTRATIONS: [IllustrationName, string][] = [
  ["success", "Envío correcto"],
  ["error", "Error y 404"],
  ["empty", "Cotización vacía"],
  ["no-results", "Búsqueda sin resultados"],
  ["offline", "Sin conexión"],
];

/** Para qué sirve cada fondo (docs/08 §3). */
const BACKGROUND_USES: Record<BackgroundPreset, string> = {
  paper: "Fondo base, blanco.",
  soft: "Secciones alternas y bloques destacados.",
  dots: "Cuaderno punteado: catálogo y listas.",
  grid: "Cuaderno cuadriculado: datos técnicos.",
  lines: "Cuaderno de renglones: historia y textos largos.",
  ink: "Trazo de tinta en la esquina: llamados a la acción.",
  brand: "Bloque azul de marca: cifras.",
  navy: "Bloque oscuro: hero y pie.",
  sun: "Amarillo infantil: escuelas.",
};

export default async function ComponentesPage() {
  const [departments, products, categories, stores] = await Promise.all([
    listDepartments(),
    listProducts(),
    listCategories(),
    listStores(),
  ]);
  return (
    <>
      <div className="container-site flex flex-col gap-16 py-16">
        <header className="flex flex-col gap-2">
          <p className="eyebrow text-blue">Styleguide</p>
          <h1>Componentes</h1>
          <p className="text-muted">Las piezas reales del sitio, en todos sus estados.</p>
        </header>

        <section className="flex flex-col gap-8" aria-labelledby="marca">
          <h2 id="marca">Marca</h2>
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
          <h3>Ilustraciones</h3>
          <ul className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-5">
            {ILLUSTRATIONS.map(([name, use]) => (
              <li key={name} className="flex flex-col items-center gap-2 text-center">
                <Illustration name={name} />
                <span className="text-sm text-muted">{use}</span>
              </li>
            ))}
          </ul>
        </section>

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
        <section className="flex flex-col gap-8" aria-labelledby="tarjetas">
          <h2 id="tarjetas">Tarjetas</h2>
          <h3>Productos (grilla de 12)</h3>
          <ul
            data-testid="grilla-productos"
            className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4"
          >
            {products.slice(0, 12).map((product) => (
              <li key={product.slug}>
                {/* Sin prefetch: las fichas, categorías y páginas por público llegan en S2. */}
                <ProductCard product={product} headingLevel={4} prefetch={false} />
              </li>
            ))}
          </ul>
          <h3>Categorías</h3>
          <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {categories.map((category) => (
              <li key={category.slug}>
                <CategoryCard category={category} headingLevel={4} prefetch={false} />
              </li>
            ))}
          </ul>
          <h3>Por público</h3>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {audiences.map((audience) => (
              <li key={audience.title}>
                <AudienceCard {...audience} headingLevel={4} prefetch={false} />
              </li>
            ))}
          </ul>
          <h3>Tiendas</h3>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {stores.slice(0, 3).map((store) => (
              <li key={store.slug}>
                <StoreCard store={store} headingLevel={4} />
              </li>
            ))}
          </ul>
          <h3>Badges y chips</h3>
          <div className="flex flex-wrap items-center gap-3">
            <Badge>Nueva</Badge>
            <Badge tone="info">En proceso</Badge>
            <Badge tone="success">Ganada</Badge>
            <Badge tone="warning">Pendiente</Badge>
            <Badge tone="danger">Perdida</Badge>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Chip line="escritura">Escritura</Chip>
            <Chip line="escolar">Escolar</Chip>
            <Chip line="arte">Arte</Chip>
            <Chip line="oficina">Oficina</Chip>
            <ChipToggle line="escolar" pressed>
              Escolar
            </ChipToggle>
            <ChipToggle line="oficina" pressed={false}>
              Oficina
            </ChipToggle>
          </div>
          <h3>Cargando (skeleton)</h3>
          <div aria-busy="true" className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            <span className="sr-only">{ui.loading.products}</span>
            {Array.from({ length: 4 }, (_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        </section>
        <section className="flex flex-col gap-8" aria-labelledby="formularios">
          <h2 id="formularios">Formularios</h2>
          <p className="text-muted">
            Patrón único: etiqueta visible, ayuda y error en español. Envíalo vacío para ver los
            errores; con el teclado se llena de principio a fin.
          </p>
          <FormDemo departments={departments.map(({ slug, name }) => ({ slug, name }))} />
        </section>
      </div>

      <section aria-labelledby="fondos" className="pb-16">
        <Container className="flex flex-col gap-2 pb-8">
          <h2 id="fondos">Fondos de sección</h2>
          <p className="text-muted">
            Los 9 fondos de Section. El admin puede cambiar el de cada sección (SectionAppearance).
          </p>
        </Container>
        {BACKGROUND_PRESETS.map((preset) => (
          <Section
            key={preset}
            as="div"
            background={preset}
            spacing="sm"
            data-testid={`fondo-${preset}`}
          >
            <div className="flex flex-col gap-4">
              <h3>{preset}</h3>
              <p>{BACKGROUND_USES[preset]}</p>
              <div>
                <Button variant={preset === "brand" || preset === "navy" ? "accent" : "primary"}>
                  Botón sobre {preset}
                </Button>
              </div>
            </div>
          </Section>
        ))}
      </section>
    </>
  );
}
