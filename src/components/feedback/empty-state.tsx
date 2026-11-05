import type { ReactNode } from "react";
import { Illustration, type IllustrationName } from "@/components/brand/illustration";

type EmptyStateProps = {
  illustration: IllustrationName;
  title: string;
  body?: string;
  /** Nivel del título según la página. */
  headingLevel?: 2 | 3 | 4;
  /** Acciones (botones o enlaces) bajo el texto. */
  children?: ReactNode;
};

/**
 * Estado vacío amable (docs/08 §4, inline): ilustración, título, texto y salida. Lo usan la
 * búsqueda sin resultados, los filtros vacíos y la cotización vacía. Textos de feedback.ts.
 */
export function EmptyState({
  illustration,
  title,
  body,
  headingLevel = 2,
  children,
}: EmptyStateProps) {
  const Heading = `h${headingLevel}` as const;
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border-2 border-dashed border-line px-6 py-10 text-center">
      <Illustration name={illustration} className="size-24" />
      <Heading className="text-xl leading-tight">{title}</Heading>
      {body ? <p className="max-w-[var(--measure)] text-muted">{body}</p> : null}
      {children ? <div className="mt-2 flex flex-wrap justify-center gap-3">{children}</div> : null}
    </div>
  );
}
