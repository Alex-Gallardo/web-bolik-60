"use client";

import Link from "next/link";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { useFeedback } from "@/components/feedback/use-feedback";
import { CountUp } from "@/components/motion/count-up";
import { Accordion } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { feedback } from "@/content/feedback";
import { SPLASH_MS } from "@/lib/splash";
import type { SiteStatView } from "@/server/data/types";
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
 * Repite el splash (A-01) como lo hace el script de <head>: data-splash en <html> y se salta con
 * un toque, clic, tecla, la rueda o un scroll. El overlay es el del layout raíz.
 */
function playSplash(reduced: boolean) {
  const root = document.documentElement;
  if (root.hasAttribute("data-splash")) return;
  let timer = 0;
  const off = () => {
    removeEventListener("keydown", skip, true);
    removeEventListener("pointerdown", skip, true);
    removeEventListener("wheel", skip, true);
    removeEventListener("scroll", skip, true);
  };
  const end = () => {
    root.removeAttribute("data-splash");
    off();
  };
  function skip() {
    off();
    clearTimeout(timer);
    root.setAttribute("data-splash", "out");
    timer = window.setTimeout(end, SPLASH_MS.out + SPLASH_MS.margin);
  }
  root.setAttribute("data-splash", reduced ? "reduced" : "on");
  addEventListener("keydown", skip, true);
  addEventListener("pointerdown", skip, true);
  addEventListener("wheel", skip, { capture: true, passive: true });
  addEventListener("scroll", skip, { capture: true, passive: true });
  timer = window.setTimeout(end, reduced ? SPLASH_MS.reduced : SPLASH_MS.on + SPLASH_MS.margin);
}

/**
 * Reveal escalonado (A-21). Al cargar se comporta como cualquier reveal: entra al bajar hasta aquí.
 * Al «Reproducir» ya está en pantalla y RevealObserver lo mostraría sin animar (regla de lo que ya
 * se ve): se fija el estado oculto antes de pintar y se revelan, para ver la transición.
 */
function RevealDemo({ replay }: { replay: boolean }) {
  const list = useRef<HTMLUListElement>(null);
  useLayoutEffect(() => {
    if (!replay) return;
    const items = Array.from(list.current?.children ?? []);
    for (const item of items) void getComputedStyle(item).opacity;
    for (const item of items) item.setAttribute("data-revealed", "");
  }, [replay]);
  return (
    <ul ref={list} className="grid w-full grid-cols-3 gap-2">
      {["Escritura", "Escolar", "Arte", "Oficina", "Kits", "Mayoreo"].map((name, i) => (
        <li
          key={name}
          data-reveal
          style={{ "--i": i } as CSSProperties}
          className="rounded-md bg-blue-50 px-2 py-3 text-center text-sm font-bold text-ink"
        >
          {name}
        </li>
      ))}
    </ul>
  );
}

/**
 * Movimiento (docs/08 §6.11, docs/09): cada animación A-xx con su demo y «Reproducir», o el
 * ticket que la trae. «Simular movimiento reducido» pone data-reduced-motion en <html>: aplica las
 * reglas de prefers-reduced-motion (bloque simulado de motion.css) a toda la página, incluidos
 * los diálogos que se dibujan fuera de esta sección.
 */
export function MotionLab({ stats }: { stats: SiteStatView[] }) {
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
    {
      code: "A-01",
      name: "Splash",
      demo: () => (
        <Button variant="outline" onClick={() => playSplash(reduced)}>
          Ver splash
        </Button>
      ),
    },
    {
      code: "A-02",
      name: "Entrada de página",
      demo: () => (
        <p className="text-sm">
          Entra con A-02 al cambiar de página dentro del sitio (no en la primera carga):{" "}
          <Link href="/styleguide/datos" className="underline">
            ir a Datos de ejemplo
          </Link>
          .
        </p>
      ),
    },
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
    {
      code: "A-20",
      name: "Conteo de cifras",
      demo: () => (
        <div className="flex flex-wrap gap-6">
          {stats.map((stat) => (
            <p key={stat.key} className="flex flex-col">
              <CountUp
                value={stat.value}
                prefix={stat.prefix ?? ""}
                suffix={stat.suffix ?? ""}
                animateOnMount
                className="font-display text-4xl font-extrabold text-blue"
              />
              <span className="text-sm text-muted">{stat.label}</span>
            </p>
          ))}
        </div>
      ),
    },
    { code: "A-21", name: "Reveal escalonado", demo: (run) => <RevealDemo replay={run > 0} /> },
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
          items={[
            {
              // Pregunta frecuente de docs/17 §7.
              title: "¿Dónde se fabrican los productos Bolik?",
              content: (
                <p>
                  En Guatemala. Bolik fabrica y empaca sus productos en su planta de San José Villa
                  Nueva desde 1966.
                </p>
              ),
            },
          ]}
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
