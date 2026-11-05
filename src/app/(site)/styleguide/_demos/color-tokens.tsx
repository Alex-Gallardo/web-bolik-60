"use client";

import { useSyncExternalStore } from "react";
import { contrastRatio } from "@/lib/contrast";

/** Tokens de color por grupo (src/styles/tokens.css). */
const GROUPS: { title: string; tokens: string[] }[] = [
  {
    title: "Marca",
    tokens: [
      "blue",
      "blue-700",
      "blue-50",
      "navy",
      "navy-700",
      "yellow",
      "yellow-600",
      "yellow-50",
      "red",
      "red-700",
      "red-50",
      "green",
      "green-50",
      "whatsapp",
    ],
  },
  {
    title: "Neutros",
    tokens: ["ink", "text", "muted", "line-control", "line-strong", "line", "soft", "paper"],
  },
  { title: "Sobre fondo oscuro", tokens: ["on-dark", "on-dark-muted"] },
  { title: "Escuelas", tokens: ["sun", "coral", "kblue", "kgreen"] },
  { title: "Semánticos", tokens: ["success", "warning", "warning-bg", "danger", "info", "focus"] },
];

const ALL = GROUPS.flatMap((group) => group.tokens);

/** Nivel WCAG para texto normal (AA 4.5, AAA 7) y grande (AA 3). */
function level(ratio: number): string {
  if (ratio >= 7) return "AAA";
  if (ratio >= 4.5) return "AA";
  if (ratio >= 3) return "AA grande";
  return "No";
}

const subscribe = () => () => {};
const isHex = (value: string | undefined): value is string =>
  Boolean(value && /^#[0-9a-f]{6}$/i.test(value));

/** «rgb(17, 19, 24)» → «#111318». */
function rgbToHex(rgb: string): string {
  const parts =
    rgb
      .match(/\d+(\.\d+)?/g)
      ?.slice(0, 3)
      .map(Number) ?? [];
  if (parts.length < 3) return "";
  return `#${parts.map((n) => Math.round(n).toString(16).padStart(2, "0")).join("")}`;
}

/**
 * Valor real de cada token, como lo resuelve el navegador. No se lee el texto de la variable: el
 * CSS minificado lo reescribe (#ffffff → #fff) y podría usar otros formatos. Se aplica a un
 * elemento de prueba y se lee su color calculado (siempre rgb). JSON estable para el store.
 */
function readTokens(): string {
  const probe = document.createElement("span");
  probe.style.display = "none";
  document.body.append(probe);
  const values = Object.fromEntries(
    ALL.map((name) => {
      probe.style.color = `var(--${name})`;
      return [name, rgbToHex(getComputedStyle(probe).color)];
    }),
  );
  probe.remove();
  return JSON.stringify(values);
}

/**
 * Muestras de color (docs/08 §6.2): nombre, valor y contraste contra blanco y contra tinta. Se
 * calcula en el navegador con los valores reales de las variables (el build de IIS no lleva src/).
 */
export function ColorTokens() {
  const json = useSyncExternalStore(subscribe, readTokens, () => "{}");
  const values = JSON.parse(json) as Record<string, string>;

  return (
    <div className="flex flex-col gap-8">
      {GROUPS.map((group) => (
        <div key={group.title} className="flex flex-col gap-3">
          <h3>{group.title}</h3>
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {group.tokens.map((name) => {
              const hex = values[name];
              const valid = isHex(hex);
              const onPaper =
                valid && isHex(values.paper) ? contrastRatio(hex, values.paper) : null;
              const onInk = valid && isHex(values.ink) ? contrastRatio(hex, values.ink) : null;
              return (
                <li key={name} data-token={name} className="flex flex-col gap-2">
                  <span
                    className="block h-16 rounded-md border-2 border-line"
                    style={{ background: `var(--${name})` }}
                  />
                  <code className="text-sm text-ink">--{name}</code>
                  <span className="text-xs text-muted tnum">{valid ? hex.toUpperCase() : "—"}</span>
                  <dl className="grid grid-cols-[auto_1fr] gap-x-2 text-xs tnum">
                    <dt className="text-muted">Sobre blanco</dt>
                    <dd data-contrast="paper">
                      {onPaper ? `${onPaper.toFixed(2)} · ${level(onPaper)}` : "—"}
                    </dd>
                    <dt className="text-muted">Sobre tinta</dt>
                    <dd data-contrast="ink">
                      {onInk ? `${onInk.toFixed(2)} · ${level(onInk)}` : "—"}
                    </dd>
                  </dl>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
