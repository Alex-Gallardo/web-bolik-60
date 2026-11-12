import type { Route } from "next";
import Link from "next/link";
import type { CSSProperties } from "react";
import { Section } from "@/components/layout/section";
import { buttonVariants } from "@/components/ui/button-variants";
import { history } from "@/content/home";
import type { MilestoneView } from "@/server/data/types";

/**
 * Historia (docs/06 §3.1 sección 11, BD-053): solo los hitos verificados (listMilestones ya
 * filtra) en una línea de tiempo, vertical en móvil y horizontal desde md. La línea se traza al
 * revelarse (A-50: scaleY/scaleX desde el origen, .timeline-line en motion.css); con movimiento
 * reducido aparece al instante. «Conoce nuestra historia» lleva a /nuestra-historia.
 */
export function HistorySection({ milestones }: { milestones: MilestoneView[] }) {
  const titleId = "historia-titulo";
  return (
    <Section appearanceKey="home.history" aria-labelledby={titleId}>
      <h2 id={titleId} className="font-display text-[length:var(--fs-h2)] font-extrabold">
        {history.title}
      </h2>

      {milestones.length > 0 && (
        <div data-reveal className="relative mt-10">
          <span
            aria-hidden="true"
            className="timeline-line absolute top-0 left-3 h-full w-0.5 bg-yellow md:top-3 md:left-0 md:h-0.5 md:w-full"
          />
          <ol
            // En md como mucho 3 columnas; desde lg, una por hito.
            className="relative grid gap-8 md:grid-cols-[repeat(min(var(--count),3),minmax(0,1fr))] md:gap-6 lg:grid-cols-[repeat(var(--count),minmax(0,1fr))]"
            style={{ "--count": milestones.length } as CSSProperties}
          >
            {milestones.map((milestone) => (
              <li key={milestone.key} className="flex gap-4 md:flex-col md:gap-3">
                <span
                  aria-hidden="true"
                  className="mt-1 size-6.5 shrink-0 rounded-full border-4 border-yellow bg-paper md:mt-0"
                />
                <div className="flex flex-col gap-1">
                  {/* El año va dentro del h3: quien navega por encabezados lo oye. */}
                  <h3 className="flex flex-col gap-1 text-lg leading-tight">
                    <span className="font-display text-2xl font-extrabold text-accent-text">
                      {milestone.year}
                    </span>
                    {milestone.title}
                  </h3>
                  <p className="text-muted">{milestone.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="mt-10">
        <Link
          href={history.cta.href as Route}
          prefetch={false}
          className={buttonVariants({ variant: "outline", block: true })}
        >
          {history.cta.label}
        </Link>
      </div>
    </Section>
  );
}
