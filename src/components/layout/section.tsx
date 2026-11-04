import type { ComponentProps, ReactNode } from "react";
import type { BackgroundPreset } from "@/lib/constants";
import { cn } from "@/lib/cn";
import { getSectionAppearance } from "@/server/data/content";
import { Container } from "./container";

type Tone = "light" | "dark";

/** Fondos de color sólido oscuro: su tono por defecto es "dark" (texto claro). */
const DARK_BACKGROUNDS: readonly BackgroundPreset[] = ["brand", "navy"];

const SPACING = {
  md: "py-(--section-y)",
  sm: "py-[calc(var(--section-y)/2)]",
  none: "",
} as const;

type SectionProps = Omit<ComponentProps<"section">, "children" | "ref"> & {
  /** Uno de los 9 fondos de backgrounds.css (docs/08 §3). */
  background?: BackgroundPreset;
  /** Por defecto se deduce del fondo (brand y navy son oscuros). Forzarlo es responsabilidad del código. */
  tone?: Tone;
  /** Espacio vertical: md = --section-y (64 → 104 px), sm = la mitad. */
  spacing?: keyof typeof SPACING;
  /** aria-labelledby solo tiene efecto en etiquetas con rol (section, aside, header, footer). */
  as?: "section" | "div" | "header" | "footer" | "aside";
  /**
   * Clave de SectionAppearance ("home.solutions"): si hay un registro, su fondo gana al de las
   * props, así el admin cambia la sección sin tocar código. Sin registro, queda el del código.
   * El tono guardado no se usa: cada fondo tiene un único tono legible (brand y navy oscuros, el
   * resto claros) y un tono que lo contradiga dejaría el texto ilegible.
   */
  appearanceKey?: string;
  /** false: sin el contenedor de 1280 px (para secciones a todo el ancho). */
  contained?: boolean;
  children: ReactNode;
};

export function resolveTone(background: BackgroundPreset, tone?: Tone): Tone {
  return tone ?? (DARK_BACKGROUNDS.includes(background) ? "dark" : "light");
}

/**
 * Sección del sitio con fondo y tono configurables (BD-020). Siempre es un Server Component async
 * (lee datos con server-only): en componentes cliente usa Container y data-bg directamente.
 */
export async function Section({
  background = "paper",
  tone,
  spacing = "md",
  as: Tag = "section",
  appearanceKey,
  contained = true,
  className,
  children,
  ...props
}: SectionProps) {
  const look = appearanceKey ? await getSectionAppearance(appearanceKey) : null;
  const bg = look?.backgroundPreset ?? background;
  // Con un fondo de la BD, el tono se deduce de ese fondo (un tone del código era para el suyo).
  const resolvedTone = look ? resolveTone(bg) : resolveTone(bg, tone);

  return (
    // Las props van primero: un data-bg de afuera no pisa el resuelto (ni el de la BD).
    <Tag
      {...props}
      data-bg={bg}
      data-tone={resolvedTone}
      className={cn(SPACING[spacing], className)}
    >
      {contained ? <Container>{children}</Container> : children}
    </Tag>
  );
}
