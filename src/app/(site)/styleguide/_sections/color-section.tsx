import { SgSection } from "../_components/sg-section";
import { ColorTokens } from "../_demos/color-tokens";

/** 2 · Color: cada token con valor y contraste contra blanco y tinta (AA/AAA). */
export function ColorSection() {
  return (
    <SgSection
      id="color"
      intro="Cada token de src/styles/tokens.css con su valor y el contraste de texto contra blanco y contra tinta: AAA ≥ 7, AA ≥ 4.5, AA grande ≥ 3."
    >
      <ColorTokens />
    </SgSection>
  );
}
