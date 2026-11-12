import { cx } from "class-variance-authority";
import type { Route } from "next";
import Link from "next/link";
import type { CSSProperties } from "react";
import { Section } from "@/components/layout/section";
import { buttonVariants } from "@/components/ui/button-variants";
import { schools } from "@/content/home";
import type { SchoolActivityView } from "@/server/data/types";

/** Fondo y texto AA de cada tarjeta (sub-paleta de escuelas, docs/02). */
const CARD_TONE: Record<SchoolActivityView["colorKey"], string> = {
  coral: "bg-coral text-ink",
  kblue: "bg-kblue text-paper",
  kgreen: "bg-kgreen text-ink",
  paper: "bg-paper text-ink",
};

/**
 * «Bolik en tu escuela» (docs/06 §3.1 sección 6, BD-053): estilo infantil con el fondo sun, las
 * actividades en tarjetas inclinadas ±1.5° que se enderezan al pasar el mouse (A-40, .kids-tilt) y
 * un garabato que se dibuja al entrar en pantalla (A-41, .scribble; docs/09 pide 1.2 s y se usa
 * --dur-slower, 700 ms, el token más cercano). Con la tipografía de títulos de siempre: la home ya usa dos
 * familias, y Baloo 2 queda para /escuelas (CLAUDE.md). Sin actividades publicadas (en producción
 * las de la demo no están), quedan el texto y el botón.
 */
export function SchoolsSection({ activities }: { activities: SchoolActivityView[] }) {
  const titleId = "escuelas-titulo";
  return (
    <Section appearanceKey="home.schools" background="sun" aria-labelledby={titleId}>
      <div className="relative flex max-w-2xl flex-col gap-4">
        <h2 id={titleId} className="font-display text-[length:var(--fs-h2)] font-extrabold">
          {schools.title}
        </h2>
        <span data-reveal className="-mt-3 block">
          <svg
            viewBox="0 0 220 24"
            aria-hidden="true"
            focusable="false"
            className="scribble h-4 w-48"
          >
            <path
              d="M3 14c20-10 34 8 54-2s34-8 52 2 38 8 58-2 34-6 50 2"
              pathLength={1}
              strokeWidth={4}
              strokeLinecap="round"
              className="fill-none stroke-coral"
            />
          </svg>
        </span>
        <p className="text-[length:var(--fs-lead)]">{schools.text}</p>
      </div>

      {activities.length > 0 && (
        <ul
          aria-label={schools.activitiesLabel}
          className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
        >
          {activities.map((activity, index) => (
            <li key={activity.key} data-reveal style={{ "--i": index } as CSSProperties}>
              <article
                // A-40: inclinadas ±1.5° (.kids-tilt en el <article>: el <li> lleva el revelado).
                className={cx(
                  "kids-tilt flex h-full flex-col gap-2 rounded-xl p-6 shadow-kids",
                  CARD_TONE[activity.colorKey],
                )}
                style={{ "--tilt": index % 2 === 0 ? "-1.5deg" : "1.5deg" } as CSSProperties}
              >
                <h3 className="text-xl leading-tight text-current">{activity.title}</h3>
                <p className="text-current">{activity.description}</p>
              </article>
            </li>
          ))}
        </ul>
      )}

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
