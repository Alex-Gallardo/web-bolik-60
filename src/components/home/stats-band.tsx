import { Section } from "@/components/layout/section";
import { CountUp } from "@/components/motion/count-up";
import { stats as text } from "@/content/home";
import type { SiteStatView } from "@/server/data/types";

/**
 * Franja de cifras (docs/06 §3.1 sección 2, BD-052) sobre el azul de marca. Solo llegan las
 * cifras publicadas: SiteStat.published es su validación (las «(validar)» de docs/17 están en
 * false). Con menos de 4 quedan centradas; sin ninguna, no hay franja. CountUp (A-20) trae el
 * número final en el HTML: lo leen el buscador y el lector de pantalla, y sin JS se ve igual.
 */
export function StatsBand({ items }: { items: SiteStatView[] }) {
  if (items.length === 0) return null;
  const titleId = "cifras-titulo";
  return (
    <Section appearanceKey="home.stats" background="brand" spacing="sm" aria-labelledby={titleId}>
      <h2 id={titleId} className="sr-only">
        {text.title}
      </h2>
      <ul className="flex flex-wrap justify-center gap-y-8 text-center">
        {items.map((stat) => (
          <li key={stat.key} className="flex w-1/2 flex-col items-center gap-1 px-2 lg:w-1/4">
            <CountUp
              value={stat.value}
              prefix={stat.prefix ?? ""}
              suffix={stat.suffix ?? ""}
              // Sin color fijo: lo pone el tono de la sección (el admin puede cambiar el fondo).
              className="font-display text-[length:var(--fs-h1)] leading-none font-extrabold"
            />
            <span className="text-text">{stat.label}</span>
          </li>
        ))}
      </ul>
    </Section>
  );
}
