import { Pending } from "../_components/pending";
import { SgSection } from "../_components/sg-section";
import { StepperDemo } from "../_demos/stepper-demo";

/** 12 · Componentes de dominio: los del catálogo, la home y la historia (docs/08 §2). */
export function DomainSection() {
  return (
    <SgSection
      id="dominio"
      intro="Piezas propias de Bolik. Las que aún no existen dicen qué ticket las trae."
    >
      <h3>Stepper (cantidad)</h3>
      <StepperDemo />
      <h3>Por llegar</h3>
      <div className="grid gap-3 md:grid-cols-2">
        <Pending what="StatCounter (cifras)" ticket="BD-052" />
        <Pending what="ColorSwatches" ticket="BD-062" />
        <Pending what="PackSelector" ticket="BD-062" />
        <Pending what="DimensionDiagram (Bolik Ultra)" ticket="BD-063" />
        <Pending what="Timeline (historia)" ticket="BD-109" />
        <Pending what="VideoHero en miniatura" ticket="BD-050" />
      </div>
    </SgSection>
  );
}
