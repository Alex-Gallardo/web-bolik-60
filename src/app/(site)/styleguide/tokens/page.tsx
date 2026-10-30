import type { Metadata } from "next";

/**
 * Vitrina interna de tokens (BD-007): colores, tipografía, radios, sombras y fondos tal como los
 * generan Tailwind y src/styles. BD-026 la integra al /styleguide completo.
 */
export const metadata: Metadata = {
  title: "Tokens · Styleguide",
  robots: { index: false, follow: false },
};

// Clases completas (no interpoladas) para que Tailwind las detecte.
const COLORS = [
  { name: "blue", className: "bg-blue" },
  { name: "blue-700", className: "bg-blue-700" },
  { name: "blue-50", className: "bg-blue-50" },
  { name: "navy", className: "bg-navy" },
  { name: "navy-700", className: "bg-navy-700" },
  { name: "yellow", className: "bg-yellow" },
  { name: "yellow-600", className: "bg-yellow-600" },
  { name: "yellow-50", className: "bg-yellow-50" },
  { name: "red", className: "bg-red" },
  { name: "red-50", className: "bg-red-50" },
  { name: "green", className: "bg-green" },
  { name: "green-50", className: "bg-green-50" },
  { name: "whatsapp", className: "bg-whatsapp" },
  { name: "ink", className: "bg-ink" },
  { name: "text", className: "bg-text" },
  { name: "muted", className: "bg-muted" },
  { name: "line", className: "bg-line" },
  { name: "line-strong", className: "bg-line-strong" },
  { name: "soft", className: "bg-soft" },
  { name: "paper", className: "bg-paper" },
  { name: "sun", className: "bg-sun" },
  { name: "coral", className: "bg-coral" },
  { name: "kblue", className: "bg-kblue" },
  { name: "kgreen", className: "bg-kgreen" },
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

const BACKGROUNDS = [
  { bg: "paper", tone: "light" },
  { bg: "soft", tone: "light" },
  { bg: "dots", tone: "light" },
  { bg: "grid", tone: "light" },
  { bg: "lines", tone: "light" },
  { bg: "ink", tone: "light" },
  { bg: "brand", tone: "dark" },
  { bg: "navy", tone: "dark" },
  { bg: "sun", tone: "light" },
];

export default function TokensPage() {
  return (
    <div className="container-site flex flex-col gap-16 py-16">
      <header className="flex flex-col gap-2">
        <p className="eyebrow text-blue">Styleguide</p>
        <h1>Tokens de diseño</h1>
        <p className="text-muted">Colores, tipografía, radios, sombras y fondos de src/styles.</p>
      </header>

      <section className="flex flex-col gap-6" aria-labelledby="colores">
        <h2 id="colores">Colores</h2>
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
          {COLORS.map((c) => (
            <li key={c.name} className="flex flex-col gap-2">
              <span
                data-token={c.name}
                className={`${c.className} block h-16 rounded-md border-2 border-line`}
              />
              <code className="text-sm text-ink">{c.name}</code>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-6" aria-labelledby="tipografia">
        <h2 id="tipografia">Tipografía</h2>
        <p className="font-display text-[length:var(--fs-hero)] font-extrabold text-ink">
          Hero · De la materia prima a tu primer trazo.
        </p>
        <p className="font-display text-[length:var(--fs-h1)] font-extrabold text-ink">
          H1 · Bolik Ultra
        </p>
        <h3>H3 · Todo lo que va en el estuche</h3>
        <p className="text-[length:var(--fs-lead)]">
          Lead · Elige tu perfil y te llevamos directo a lo que necesitas.
        </p>
        <p>Cuerpo · Útiles para escribir la historia de Guatemala desde 1966.</p>
        <p className="font-kids text-2xl font-bold text-coral">
          Kids · ¡Aprender a escribir es una aventura!
        </p>
      </section>

      <section className="flex flex-col gap-6" aria-labelledby="radios">
        <h2 id="radios">Radios y sombras</h2>
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
      </section>

      <section className="flex flex-col gap-6" aria-labelledby="fondos">
        <h2 id="fondos">Fondos de sección</h2>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {BACKGROUNDS.map((b) => (
            <li
              key={b.bg}
              data-bg={b.bg}
              data-tone={b.tone}
              className="flex h-36 items-end overflow-hidden rounded-lg border-2 border-line p-4"
            >
              <h3 className="text-xl">{b.bg}</h3>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
