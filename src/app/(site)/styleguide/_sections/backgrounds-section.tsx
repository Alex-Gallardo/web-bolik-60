import { Section, resolveTone } from "@/components/layout/section";
import { Button } from "@/components/ui/button";
import { BACKGROUND_PRESETS, type BackgroundPreset } from "@/lib/constants";
import { SgSection } from "../_components/sg-section";

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

/**
 * 5 · Fondos: los 9 presets de Section. El tono (texto claro u oscuro) se deduce del fondo: el
 * admin elige solo el fondo (SectionAppearance) y el contraste queda garantizado.
 */
export function BackgroundsSection() {
  return (
    <SgSection
      id="fondos"
      intro="Los 9 fondos de Section. El admin puede cambiar el de cada sección; el tono del texto se deduce del fondo, así nunca queda texto sin contraste."
    >
      <div className="flex flex-col gap-4">
        {BACKGROUND_PRESETS.map((preset) => (
          <Section
            key={preset}
            as="div"
            background={preset}
            spacing="sm"
            contained={false}
            data-testid={`fondo-${preset}`}
            className="rounded-xl border-2 border-line px-6"
          >
            <div className="flex flex-col gap-4">
              <h3>{preset}</h3>
              <p>
                {BACKGROUND_USES[preset]} Tono:{" "}
                {resolveTone(preset) === "dark" ? "oscuro" : "claro"}.
              </p>
              <div>
                <Button variant={preset === "brand" || preset === "navy" ? "accent" : "primary"}>
                  Botón sobre {preset}
                </Button>
              </div>
            </div>
          </Section>
        ))}
      </div>
    </SgSection>
  );
}
