import type { ReactNode } from "react";
import { SECTIONS, type SectionId } from "./sections";

type SgSectionProps = {
  id: SectionId;
  intro?: ReactNode;
  children: ReactNode;
};

/** Sección numerada del styleguide (docs/08 §6): ancla, número, título (h2) e introducción. */
export function SgSection({ id, intro, children }: SgSectionProps) {
  const index = SECTIONS.findIndex((section) => section.id === id);
  const titleId = `${id}-titulo`;
  return (
    <section
      id={id}
      aria-labelledby={titleId}
      className="flex flex-col gap-8 border-t-2 border-line pt-12"
    >
      <header className="flex flex-col gap-2">
        <p className="eyebrow text-blue">{String(index + 1).padStart(2, "0")}</p>
        <h2 id={titleId}>{SECTIONS[index]!.title}</h2>
        {intro ? <p className="max-w-[var(--measure)] text-muted">{intro}</p> : null}
      </header>
      {children}
    </section>
  );
}
