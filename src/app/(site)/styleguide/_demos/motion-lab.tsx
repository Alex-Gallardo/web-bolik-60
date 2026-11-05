"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { useFeedback } from "@/components/feedback/use-feedback";
import { Accordion } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { feedback } from "@/content/feedback";
import { EXAMPLES } from "./examples";

type Row = {
  code: string;
  name: string;
  /** Demo que se vuelve a montar con «Reproducir». */
  demo?: (run: number) => ReactNode;
  /** Ticket que la trae, si todavía no existe. */
  ticket?: string;
};

/**
 * Movimiento (docs/08 §6.11, docs/09): cada animación A-xx con su demo y «Reproducir», o el
 * ticket que la trae. «Simular movimiento reducido» pone data-reduced-motion en <html>: aplica las
 * reglas de prefers-reduced-motion (bloque simulado de motion.css) a toda la página, incluidos
 * los diálogos que se dibujan fuera de esta sección.
 */
export function MotionLab() {
  const { dialog } = useFeedback();
  const [reduced, setReduced] = useState(false);
  const [runs, setRuns] = useState<Record<string, number>>({});

  useEffect(() => {
    const root = document.documentElement;
    if (reduced) root.dataset.reducedMotion = "";
    else delete root.dataset.reducedMotion;
    return () => {
      delete root.dataset.reducedMotion;
    };
  }, [reduced]);

  const rows: Row[] = [
    { code: "A-01", name: "Splash", ticket: "BD-043" },
    { code: "A-02", name: "Entrada de página", ticket: "BD-044" },
    {
      code: "A-03",
      name: "Presionar",
      demo: () => <Button>Mantén presionado</Button>,
    },
    {
      code: "A-04",
      name: "Error de campo",
      demo: (run) => (
        <span
          className={`${run ? "shake" : ""} inline-block rounded-md border-2 border-red px-4 py-2`}
        >
          Este dato es necesario
        </span>
      ),
    },
    {
      code: "A-05",
      name: "Contador «pop»",
      demo: (run) => (
        <span
          className={`${run ? "badge-pop" : ""} grid size-10 place-items-center rounded-full bg-yellow font-bold text-ink`}
        >
          {run + 1}
        </span>
      ),
    },
    { code: "A-06", name: "Hover de enlace", ticket: "BD-041" },
    { code: "A-07", name: "Header compacto", ticket: "BD-041" },
    {
      code: "A-08",
      name: "Sheet / drawer",
      demo: () => (
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline">Abrir sheet</Button>
          </SheetTrigger>
          <SheetContent title="Sheet de ejemplo">
            <p className="text-muted">
              Desliza desde su lado; con movimiento reducido, solo opacidad.
            </p>
          </SheetContent>
        </Sheet>
      ),
    },
    {
      code: "A-09",
      name: "Diálogo",
      demo: () => (
        <Button
          variant="outline"
          onClick={() => dialog(feedback.quote.sent(EXAMPLES.quoteFolio), { kind: "success" })}
        >
          Abrir diálogo
        </Button>
      ),
    },
    { code: "A-10", name: "Crossfade del hero", ticket: "BD-050" },
    {
      code: "A-11",
      name: "Subrayado de tinta",
      demo: (run) => (
        <svg viewBox="0 0 200 20" aria-hidden="true" className="h-5 w-48">
          <path
            key={run}
            className="ink-draw fill-none stroke-yellow"
            style={{ "--path-length": 1 } as CSSProperties}
            pathLength={1}
            strokeWidth="6"
            strokeLinecap="round"
            d="M4 14c50-8 130-10 192-4"
          />
        </svg>
      ),
    },
    { code: "A-12", name: "Texto del capítulo", ticket: "BD-050" },
    { code: "A-13", name: "Progreso del capítulo", ticket: "BD-050" },
    { code: "A-20", name: "Conteo de cifras", ticket: "BD-044" },
    { code: "A-21", name: "Reveal escalonado", ticket: "BD-044" },
    { code: "A-22", name: "Reordenar grilla", ticket: "BD-060" },
    {
      code: "A-30",
      name: "Elevar tarjeta",
      demo: () => (
        <div className="lift rounded-lg border-2 border-line bg-paper px-5 py-4">
          Pasa el puntero por encima
        </div>
      ),
    },
    { code: "A-31", name: "Cambio de color", ticket: "BD-062" },
    { code: "A-32", name: "Sheet de filtros", ticket: "BD-060" },
    { code: "A-33", name: "Cota interactiva", ticket: "BD-063" },
    { code: "A-34", name: "Pines del mapa", ticket: "BD-081" },
    {
      code: "A-35",
      name: "Acordeón",
      demo: () => (
        <Accordion
          items={[{ title: "¿Dónde se fabrica?", content: <p>En Guatemala, desde 1966.</p> }]}
        />
      ),
    },
    { code: "A-36", name: "Quitar línea", ticket: "BD-071" },
    { code: "A-40", name: "Tarjetas infantiles", ticket: "BD-105" },
    { code: "A-41", name: "Garabatos", ticket: "BD-105" },
    { code: "A-50", name: "Línea de tiempo", ticket: "BD-109" },
    {
      code: "A-60",
      name: "Éxito",
      demo: () => (
        <Button
          variant="outline"
          onClick={() =>
            dialog(feedback.forms.schoolSent(EXAMPLES.schoolFolio, EXAMPLES.schoolName), {
              kind: "success",
              celebrate: true,
            })
          }
        >
          Ver éxito con confeti
        </Button>
      ),
    },
    {
      code: "A-70",
      name: "Skeleton",
      demo: () => <Skeleton className="h-6 w-48" />,
    },
    {
      code: "A-71",
      name: "Spinner",
      demo: () => <Spinner className="size-6 text-blue" />,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <button
        type="button"
        role="switch"
        aria-checked={reduced}
        onClick={() => setReduced((value) => !value)}
        className="flex min-h-11 cursor-pointer items-center gap-3 self-start font-bold"
      >
        <span
          aria-hidden="true"
          className={`relative h-7 w-12 rounded-full border-2 ${reduced ? "border-blue bg-blue" : "border-line-control bg-soft"}`}
        >
          <span
            className={`absolute top-0.5 left-0.5 size-5 rounded-full bg-paper shadow-sm transition-transform duration-(--dur-fast) ease-(--ease-out) ${reduced ? "translate-x-5" : ""}`}
          />
        </span>
        Simular movimiento reducido
      </button>
      <ul className="grid gap-3 md:grid-cols-2">
        {rows.map((row) => {
          const run = runs[row.code] ?? 0;
          return (
            <li
              key={row.code}
              data-animation={row.code}
              className="flex flex-col gap-3 rounded-lg border-2 border-line p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-base">
                  <span className="text-muted tnum">{row.code}</span> · {row.name}
                </h3>
                {row.demo ? (
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => setRuns((all) => ({ ...all, [row.code]: run + 1 }))}
                  >
                    Reproducir
                  </Button>
                ) : null}
              </div>
              {row.demo ? (
                <div key={run} className="flex min-h-12 items-center">
                  {row.demo(run)}
                </div>
              ) : (
                <p className="text-sm text-muted">Llega con {row.ticket}</p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
