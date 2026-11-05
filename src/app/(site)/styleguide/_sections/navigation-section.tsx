import { Accordion } from "@/components/ui/accordion";
import { Tabs, type TabItem } from "@/components/ui/tabs";
import type { FaqView, ProductView } from "@/server/data/types";
import { Pending } from "../_components/pending";
import { SgSection } from "../_components/sg-section";
import { OverlayDemo } from "../_demos/overlay-demo";

type NavigationSectionProps = { featured: ProductView | null; faqs: FaqView[] };

/** Pestañas de la ficha (docs/06 §4) con los datos de ejemplo del producto estrella. */
function productTabs(featured: ProductView): TabItem[] {
  return [
    {
      value: "especificaciones",
      label: "Especificaciones",
      content: (
        <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-[auto_1fr]">
          {featured.specs.flatMap((group) =>
            group.items.map((item) => (
              <div key={`${group.name}-${item.label}`} className="contents">
                <dt className="font-bold">{item.label}</dt>
                <dd className="text-muted">{item.value}</dd>
              </div>
            )),
          )}
        </dl>
      ),
    },
    {
      value: "medidas",
      label: "Medidas",
      content: (
        <ul className="flex flex-col gap-1">
          {featured.dimensions.map((d) => (
            <li key={d.partKey}>
              <span className="font-bold">{d.label}:</span> {d.valueMm} mm
            </li>
          ))}
        </ul>
      ),
    },
    {
      value: "distribuidores",
      label: "Para distribuidores",
      content: (
        <ul className="flex flex-col gap-1">
          {featured.packagings.map((pack) => (
            <li key={pack.code}>
              <span className="font-bold">{pack.name}:</span> {pack.unitsPerPack} unidades
            </li>
          ))}
        </ul>
      ),
    },
    {
      value: "seguridad",
      label: "Seguridad",
      content: <p className="max-w-[var(--measure)]">{featured.safetyWarning}</p>,
    },
  ];
}

/** 9 · Navegación: overlays, pestañas, acordeón; breadcrumbs, paginación, header y footer después. */
export function NavigationSection({ featured, faqs }: NavigationSectionProps) {
  return (
    <SgSection
      id="navegacion"
      intro="Escape cierra los overlays y el foco vuelve al botón que los abrió. Pestañas y acordeón tienen todo su contenido en el HTML y se ven completos sin JavaScript."
    >
      <h3>Sheet, Dialog y Popover</h3>
      <OverlayDemo />
      <h3>Pestañas (acordeón bajo 768 px)</h3>
      <Tabs
        label="Información del producto"
        items={featured ? productTabs(featured) : []}
        headingLevel={4}
      />
      <h3>Acordeón</h3>
      <Accordion
        exclusive="faq-demo"
        items={faqs.map((faq) => ({
          id: `faq-${faq.key}`,
          title: faq.question,
          content: <p>{faq.answer}</p>,
        }))}
      />
      <h3>Por llegar</h3>
      <div className="grid gap-3 md:grid-cols-2">
        <Pending what="Breadcrumbs" ticket="BD-093" />
        <Pending what="Paginación (admin)" ticket="BD-115" />
        <Pending what="Header en miniatura" ticket="BD-041" />
        <Pending what="Footer en miniatura" ticket="BD-042" />
      </div>
    </SgSection>
  );
}
