import type { Route } from "next";
import Link from "next/link";
import { Section } from "@/components/layout/section";
import { ActivityCards } from "@/components/schools/activity-cards";
import { KidsScribble } from "@/components/schools/kids-decor";
import { buttonVariants } from "@/components/ui/button-variants";
import { schools } from "@/content/home";
import type { SchoolActivityView } from "@/server/data/types";

/**
/**
 * «Bolik en tu escuela» (docs/06 §3.1 sección 7, BD-053): estilo infantil con el fondo sun, las
 * actividades en tarjetas inclinadas (A-40) y un garabato que se dibuja al entrar en pantalla
 * (A-41); las dos piezas están en components/schools y las comparte /escuelas (BD-105). Con la
 * tipografía de títulos de siempre: la home ya usa dos familias, y Baloo 2 queda para /escuelas
 * (CLAUDE.md). Sin actividades publicadas (en producción las de la demo no están), quedan el
 * texto y el botón.
 */
export function SchoolsSection({ activities }: { activities: SchoolActivityView[] }) {
  const titleId = "escuelas-titulo";
  return (
    <Section appearanceKey="home.schools" background="sun" aria-labelledby={titleId}>
      <div className="relative flex max-w-2xl flex-col gap-4">
        <h2 id={titleId} className="font-display text-[length:var(--fs-h2)] font-extrabold">
          {schools.title}
        </h2>
        <KidsScribble draw="reveal" className="h-4 w-48" />
        <p className="text-[length:var(--fs-lead)]">{schools.text}</p>
      </div>

      <ActivityCards activities={activities} label={schools.activitiesLabel} className="mt-10" />

      <div className="mt-10">
        <Link
          href={schools.cta.href as Route}
          prefetch={false}
          className={buttonVariants({ variant: "dark", block: true })}
          data-event="solution_click"
          data-audience="colegios"
        >
          {schools.cta.label}
        </Link>
      </div>
    </Section>
  );
}
