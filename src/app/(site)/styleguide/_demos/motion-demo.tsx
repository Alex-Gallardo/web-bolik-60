"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, m } from "@/components/motion/m";
import { MotionProvider } from "@/components/motion/motion-provider";
import { Button } from "@/components/ui/button";
import { feedback } from "@/content/feedback";
import { lineExit } from "@/lib/motion";
import { EXAMPLES } from "./examples";

/** Líneas de ejemplo con los colores del Bolik Ultra (docs/17 §2). */
const LINES = EXAMPLES.colors.map((color) => `Bolik Ultra ${color.name} · Cajilla de 12`);
const RESTORE = "restaurar";

/**
 * Motion diferido (BD-045): adelanto de A-36 (quitar una línea de la cotización, BD-071). Se
 * descarga al pulsar «Reproducir» (next/dynamic en motion-lab.tsx); hasta entonces Motion no está
 * en el JS de la página. Patrón para BD-071: el foco pasa a la línea siguiente (o a la anterior, o
 * a «Restaurar» si no queda ninguna) y un aviso cortés anuncia lo que se quitó.
 */
export function MotionDemo() {
  const [lines, setLines] = useState<string[]>(LINES);
  const [announcement, setAnnouncement] = useState("");
  // A dónde va el foco cuando React pinte la lista nueva (el botón pulsado ya no estará).
  const pendingFocus = useRef<string | null>(null);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const key = pendingFocus.current;
    pendingFocus.current = null;
    if (!key) return;
    root.current
      ?.querySelector<HTMLButtonElement>(`[data-focus-key="${CSS.escape(key)}"]`)
      ?.focus();
  }, [lines]);

  const remove = (line: string) => {
    const index = lines.indexOf(line);
    const rest = lines.filter((item) => item !== line);
    setLines(rest);
    pendingFocus.current = rest[index] ?? rest[index - 1] ?? RESTORE;
    setAnnouncement(feedback.quote.removed(line).title);
  };

  const restore = () => {
    pendingFocus.current = LINES[0]!;
    setLines(LINES);
    setAnnouncement("");
  };

  return (
    <MotionProvider>
      <div ref={root} className="flex w-full flex-col gap-3">
        <ul className="flex flex-col gap-2" data-motion-demo>
          <AnimatePresence initial={false}>
            {lines.map((line) => (
              <m.li
                key={line}
                {...lineExit}
                className="flex items-center justify-between gap-3 rounded-md border-2 border-line px-3 py-1 text-sm"
              >
                <span>{line}</span>
                <Button data-focus-key={line} variant="link" size="sm" onClick={() => remove(line)}>
                  Quitar<span className="sr-only"> {line}</span>
                </Button>
              </m.li>
            ))}
          </AnimatePresence>
        </ul>
        <Button data-focus-key={RESTORE} variant="link" className="self-start" onClick={restore}>
          Restaurar
        </Button>
        <p className="sr-only" aria-live="polite">
          {announcement}
        </p>
      </div>
    </MotionProvider>
  );
}
