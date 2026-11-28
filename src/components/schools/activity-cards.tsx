import { cx } from "class-variance-authority";
import type { CSSProperties } from "react";
import type { SchoolActivityView } from "@/server/data/types";

/** Fondo y texto AA de cada tarjeta (sub-paleta de escuelas, docs/02). */
const CARD_TONE: Record<SchoolActivityView["colorKey"], string> = {
  coral: "bg-coral text-ink",
  kblue: "bg-kblue text-paper",
  kgreen: "bg-kgreen text-ink",
  paper: "bg-paper text-ink",
};

type ActivityCardsProps = {
  activities: SchoolActivityView[];
  /** Nombre de la lista si la sección no tiene un h2 que la nombre. */
  label?: string;
  /** Títulos con Baloo 2 (solo en /escuelas, que carga la fuente). */
  kidsFont?: boolean;
  className?: string;
};

/**
 * Actividades para escuelas (docs/06 §3.1 sección 7 y §3.9; BD-053, BD-105): tarjetas de color
 * inclinadas ±1.5° que se enderezan al pasar el mouse (A-40, .kids-tilt) y entran escalonadas
 * (A-21). Las comparten la home y /escuelas. Sin actividades, nada.
 */
export function ActivityCards({
  activities,
  label,
  kidsFont = false,
  className,
}: ActivityCardsProps) {
  if (activities.length === 0) return null;
  return (
    <ul aria-label={label} className={cx("grid gap-6 sm:grid-cols-2 lg:grid-cols-4", className)}>
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
            <h3 className={cx("text-xl leading-tight text-current", kidsFont && "font-kids")}>
              {activity.title}
            </h3>
            <p className="text-current">{activity.description}</p>
          </article>
        </li>
      ))}
    </ul>
  );
}
