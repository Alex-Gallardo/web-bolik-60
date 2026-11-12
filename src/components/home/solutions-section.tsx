import type { CSSProperties } from "react";
import { Section } from "@/components/layout/section";
import { audiences, solutions } from "@/content/home";
import { AudienceCard } from "./audience-card";

/**
 * «Un Bolik para cada etapa» (docs/06 §3.1 sección 4, BD-051): una tarjeta de color por público.
 * En móvil es un carrusel con scroll-snap (sin JS); desde lg, 3 columnas y desde xl, 5 (a 1024 px
 * «Universidades» no cabe en una quinta parte). Cada tarjeta entra con
 * el revelado A-21 (data-reveal en el <li>: la tarjeta con .lift eleva al pasar el mouse, A-30),
 * escalonado solo desde lg: en el carrusel, la tarjeta que entra al deslizar aparece sin esperar
 * su turno. data-event queda listo para la analítica (solution_click).
 */
export function SolutionsSection() {
  const titleId = "soluciones-titulo";
  return (
    <Section appearanceKey="home.solutions" aria-labelledby={titleId}>
      <h2
        id={titleId}
        className="font-display text-[length:var(--fs-h2)] font-extrabold text-heading"
      >
        {solutions.title}
      </h2>
      <ul
        // El carrusel ocupa el ancho completo en móvil: sale del margen y lo devuelve con padding.
        // py-5: el translateY del revelado (16 px) cabe sin crear scroll vertical en la lista.
        className="-mx-[var(--gutter)] mt-6 flex snap-x snap-mandatory scroll-px-[var(--gutter)] gap-4 overflow-x-auto px-[var(--gutter)] py-5 lg:mx-0 lg:grid lg:grid-cols-3 lg:overflow-visible lg:px-0 xl:grid-cols-5"
      >
        {audiences.map((audience, index) => (
          <li
            key={audience.key}
            data-reveal
            style={{ "--n": index } as CSSProperties}
            className="w-[min(18rem,78vw)] shrink-0 snap-start [--i:0] lg:w-auto lg:[--i:var(--n)]"
          >
            <AudienceCard
              title={audience.title}
              text={audience.text}
              href={audience.href}
              tone={audience.tone}
              prefetch={false}
              data-event="solution_click"
              data-audience={audience.key}
            />
          </li>
        ))}
      </ul>
    </Section>
  );
}
