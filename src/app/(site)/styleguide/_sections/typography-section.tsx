import { SgSection } from "../_components/sg-section";

/** Escala tipográfica (tokens.css): tamaño a 360 px → en escritorio. */
const SCALE = [
  {
    token: "hero",
    size: "40 → 74 px",
    className: "font-display text-[length:var(--fs-hero)] font-extrabold",
    sample: "De la materia prima a tu primer trazo.",
  },
  {
    token: "h1",
    size: "34 → 56 px",
    className: "font-display text-[length:var(--fs-h1)] font-extrabold",
    sample: "Bolik Ultra",
  },
  {
    token: "h2",
    size: "28 → 46 px",
    className: "font-display text-[length:var(--fs-h2)] font-extrabold",
    sample: "Encuentra lo que necesitas",
  },
  {
    token: "h3",
    size: "21 → 26 px",
    className: "font-display text-[length:var(--fs-h3)] font-bold",
    sample: "Todo lo que va en el estuche",
  },
  {
    token: "lead",
    size: "18 → 20 px",
    className: "text-[length:var(--fs-lead)]",
    sample: "Elige tu perfil y te llevamos directo a lo que necesitas.",
  },
  {
    token: "body",
    size: "16 → 17 px",
    className: "text-[length:var(--fs-body)]",
    sample: "Útiles para escribir la historia de Guatemala desde 1966.",
  },
  {
    token: "small",
    size: "14 px",
    className: "text-[length:var(--fs-small)]",
    sample: "Útiles escolares y de oficina fabricados en Guatemala.",
  },
  { token: "micro", size: "12 px", className: "eyebrow", sample: "60 años · Hecho en Guatemala" },
];

/** 3 · Tipografía: escala completa, párrafo, lista, cita y Baloo 2 para escuelas. */
export function TypographySection() {
  return (
    <SgSection
      id="tipografia"
      intro="Bricolage Grotesque en títulos y DM Sans en texto. Baloo 2 solo en escuelas."
    >
      <ul className="flex flex-col gap-6">
        {SCALE.map((item) => (
          <li key={item.token} data-type={item.token} className="flex flex-col gap-1">
            <span className="text-xs text-muted tnum">
              --fs-{item.token} · {item.size}
            </span>
            <p className={`${item.className} text-ink`}>{item.sample}</p>
          </li>
        ))}
      </ul>
      <div className="grid gap-8 md:grid-cols-2">
        <div className="flex max-w-[var(--measure)] flex-col gap-4">
          <h3>Párrafo y lista</h3>
          <p>
            El Bolik Ultra tiene punta mediana de 1.0 mm y tinta de baja viscosidad: escribe suave y
            no se corre con el agua.
          </p>
          <ul className="list-disc ps-6">
            <li>Punta de última generación</li>
            <li>Tapa ventilada</li>
            <li>Cuerpo hexagonal que no rueda</li>
          </ul>
        </div>
        <div className="flex flex-col gap-4">
          <h3>Cita</h3>
          <blockquote className="border-s-4 border-yellow ps-4 text-[length:var(--fs-lead)] text-ink">
            «60 años escribiendo con Guatemala.»
          </blockquote>
          <h3>Escuelas (Baloo 2)</h3>
          <p className="font-kids text-2xl font-bold text-coral">
            ¡Aprender a escribir es una aventura!
          </p>
        </div>
      </div>
    </SgSection>
  );
}
