import type { ReactNode } from "react";
import { ToneIcon } from "@/components/feedback/tone-icon";
import { Pending } from "../_components/pending";
import { SgSection } from "../_components/sg-section";

/** Trazo común de los íconos propios: 24 px, línea de 2.5, puntas redondas, color del texto. */
function Glyph({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      className="size-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

/** Íconos en línea que ya usa el sitio (los paths son los mismos de cada componente). */
const ICONS: { name: string; use: string; icon: ReactNode }[] = [
  { name: "Éxito", use: "Toasts y avisos", icon: <ToneIcon tone="success" className="size-6" /> },
  {
    name: "Información",
    use: "Toasts y avisos",
    icon: <ToneIcon tone="info" className="size-6" />,
  },
  {
    name: "Advertencia",
    use: "Toasts y sin conexión",
    icon: <ToneIcon tone="warning" className="size-6" />,
  },
  { name: "Error", use: "Toasts y avisos", icon: <ToneIcon tone="error" className="size-6" /> },
  {
    name: "Cerrar",
    use: "Dialog y Sheet",
    icon: (
      <Glyph>
        <path d="m6 6 12 12M18 6 6 18" />
      </Glyph>
    ),
  },
  {
    name: "Más / abrir",
    use: "Acordeón (rota a ×)",
    icon: (
      <Glyph>
        <path d="M12 5v14M5 12h14" />
      </Glyph>
    ),
  },
  {
    name: "Flecha",
    use: "Tarjetas por público y botones",
    icon: (
      <Glyph>
        <path d="M5 12h14m-6-6 6 6-6 6" />
      </Glyph>
    ),
  },
];

/** 13 · Íconos: los propios en uso; el set de Lucide llega con el header. */
export function IconsSection() {
  return (
    <SgSection
      id="iconos"
      intro="Siempre junto a un texto o con nombre accesible: el ícono solo nunca es el único indicador."
    >
      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
        {ICONS.map((item) => (
          <li
            key={item.name}
            className="flex items-center gap-3 rounded-lg border-2 border-line p-4 text-ink"
          >
            {item.icon}
            <span className="flex flex-col">
              <span className="font-bold">{item.name}</span>
              <span className="text-sm text-muted">{item.use}</span>
            </span>
          </li>
        ))}
      </ul>
      <Pending what="Set de Lucide e íconos de beneficios" ticket="BD-041 y BD-062" />
    </SgSection>
  );
}
