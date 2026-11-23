import Link from "next/link";
import { DimensionDiagram } from "@/components/product/dimension-diagram";
import type { DimensionView } from "@/server/data/types";
import seedProducts from "../../../../../prisma/seed/products.json";
import { Pending } from "../_components/pending";
import { SgSection } from "../_components/sg-section";
import { StepperDemo } from "../_demos/stepper-demo";

type SeedDimension = { partKey: string; label: string; valueMm: number; tolerance?: string };

/**
 * Medidas fijas del Bolik Ultra, del seed (prisma/seed/products.json) y no de la base: la demo no
 * depende de lo que haya publicado (docs/08 §6 punto 12).
 */
const ULTRA_DIMENSIONS: DimensionView[] = (
  (seedProducts as { slug: string; dimensions?: SeedDimension[] }[]).find(
    (p) => p.slug === "bolik-ultra",
  )?.dimensions ?? []
).map((d) => ({ ...d, tolerance: d.tolerance ?? null }));

/** 12 · Componentes de dominio: los del catálogo, la home y la historia (docs/08 §2). */
export function DomainSection() {
  return (
    <SgSection
      id="dominio"
      intro="Piezas propias de Bolik. Las que aún no existen dicen qué ticket las trae."
    >
      <h3>Stepper (cantidad)</h3>
      <StepperDemo />
      <h3>ColorSwatches, PackSelector y WhatsAppSheet</h3>
      <p>
        Viven en la ficha de producto (BD-062), con los datos reales del producto:{" "}
        <Link
          href="/productos/boligrafos/bolik-ultra"
          prefetch={false}
          className="text-accent-text underline underline-offset-4"
        >
          ficha del Bolik Ultra
        </Link>
        .
      </p>
      <h3>DimensionDiagram</h3>
      <DimensionDiagram id="sg-cota" productName="Bolik Ultra" dimensions={ULTRA_DIMENSIONS} />
      <h3>Por llegar</h3>
      <div className="grid gap-3 md:grid-cols-2">
        <Pending what="StatCounter (cifras)" ticket="BD-052" />
        <Pending what="Timeline (historia)" ticket="BD-109" />
        <Pending what="VideoHero en miniatura" ticket="BD-050" />
      </div>
    </SgSection>
  );
}
