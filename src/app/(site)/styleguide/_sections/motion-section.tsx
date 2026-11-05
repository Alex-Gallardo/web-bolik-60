import { SgSection } from "../_components/sg-section";
import { MotionLab } from "../_demos/motion-lab";

/** 11 · Movimiento: cada animación A-xx (docs/09) con «Reproducir» y el interruptor de movimiento reducido. */
export function MotionSection() {
  return (
    <SgSection
      id="movimiento"
      intro="Solo transform y opacity, con los tokens de motion.css. El interruptor aplica a toda la página las reglas de prefers-reduced-motion: sin desplazamientos, solo opacidad breve."
    >
      <MotionLab />
    </SgSection>
  );
}
