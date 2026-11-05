import { SgSection } from "../_components/sg-section";

// Clases completas (no interpoladas) para que Tailwind las detecte.
const SPACES = [
  { name: "1 · 4", className: "w-1" },
  { name: "2 · 8", className: "w-2" },
  { name: "3 · 12", className: "w-3" },
  { name: "4 · 16", className: "w-4" },
  { name: "6 · 24", className: "w-6" },
  { name: "8 · 32", className: "w-8" },
  { name: "12 · 48", className: "w-12" },
  { name: "16 · 64", className: "w-16" },
];
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
        {SPACES.map((s) => (
          <li key={s.name} className="flex items-center gap-4">
            <span className={`${s.className} block h-4 rounded-sm bg-blue`} />
            <span className="text-sm text-muted tnum">--space-{s.name} px</span>
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
