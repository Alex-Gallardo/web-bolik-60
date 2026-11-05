import { SgSection } from "../_components/sg-section";

/** Escala --space-N de tokens.css (N × 4 px): cada barra mide el token real. */
const SPACES = [1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24];

// Clases completas (no interpoladas) para que Tailwind las detecte.
const RADII = [
  { name: "sm · 10", className: "rounded-sm" },
  { name: "md · 14", className: "rounded-md" },
  { name: "lg · 22", className: "rounded-lg" },
  { name: "xl · 28", className: "rounded-xl" },
];
const SHADOWS = [
  { name: "sm", className: "shadow-sm" },
  { name: "md", className: "shadow-md" },
  { name: "lg", className: "shadow-lg" },
  { name: "kids", className: "shadow-kids" },
];

/** 4 · Espacios, radios y sombras: las reglas visuales de tokens.css. */
export function SpacingSection() {
  return (
    <SgSection
      id="espacios"
      intro="Escala de 4 px; radios por tamaño de pieza (chips, botones, tarjetas, modales) y sombras suaves con tinte de tinta."
    >
      <h3>Espacios</h3>
      <ul className="flex flex-col gap-2">
        {SPACES.map((n) => (
          <li key={n} className="flex items-center gap-4">
            <span
              className="block h-4 shrink-0 rounded-sm bg-blue"
              style={{ width: `var(--space-${n})` }}
            />
            <span className="text-sm text-muted tnum">
              --space-{n} · {n * 4} px
            </span>
          </li>
        ))}
      </ul>
      <h3>Radios</h3>
      <ul className="flex flex-wrap gap-6">
        {RADII.map((r) => (
          <li
            key={r.name}
            data-radius={r.name}
            className={`${r.className} grid size-28 place-items-center bg-blue-50 text-sm text-ink`}
          >
            {r.name}
          </li>
        ))}
      </ul>
      <h3>Sombras</h3>
      <ul className="flex flex-wrap gap-6">
        {SHADOWS.map((s) => (
          <li
            key={s.name}
            data-shadow={s.name}
            className={`${s.className} grid size-28 place-items-center rounded-lg bg-paper text-sm text-ink`}
          >
            {s.name}
          </li>
        ))}
      </ul>
    </SgSection>
  );
}
