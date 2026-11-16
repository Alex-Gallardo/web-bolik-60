import { productPage } from "@/content/product";
import type { DimensionView } from "@/server/data/types";

/** Partes del bolígrafo que el dibujo sabe acotar (ProductDimension.partKey, docs/05). */
export const PEN_PARTS = ["body", "cap", "tip_length", "tip_diameter", "mark"] as const;
type PenPart = (typeof PEN_PARTS)[number];

/** Unidades del dibujo por milímetro: el cuerpo de 145.83 mm ocupa ~500 de unas 700. */
const SCALE = 3.4;
const LEFT = 30;
/** Largo del cono (dentro del largo del cuerpo). */
const CONE = 10;
/**
 * La punta real mide unos milímetros: a escala no se vería a 360 px. Se dibuja con este mínimo
 * (no a escala); la etiqueta siempre dice la medida real.
 */
const MIN_TIP_LENGTH = 24;
const MIN_TIP_DIAMETER = 10;

const mmOf = (dimensions: readonly DimensionView[], part: PenPart) => {
  const value = dimensions.find((d) => d.partKey === part)?.valueMm ?? 0;
  return value > 0 ? value : 0;
};

/** El diagrama solo tiene sentido para un bolígrafo: necesita el largo del cuerpo. */
export function hasPenDiagram(dimensions: readonly DimensionView[]): boolean {
  return mmOf(dimensions, "body") > 0;
}

/** Geometría del dibujo a partir de las medidas reales; lo que falte (o valga 0) no se dibuja. */
export function penGeometry(dimensions: readonly DimensionView[]) {
  const body = mmOf(dimensions, "body") * SCALE;
  const cap = mmOf(dimensions, "cap") * SCALE;
  const tipLength = mmOf(dimensions, "tip_length") * SCALE;
  const tipDiameter = mmOf(dimensions, "tip_diameter") * SCALE;
  const mark = mmOf(dimensions, "mark") * SCALE;
  const bodyEnd = LEFT + body;
  // La punta se dibuja si hay largo o diámetro; con un mínimo para que se vea.
  const hasTip = tipLength > 0 || tipDiameter > 0;
  const tip = hasTip
    ? {
        x1: bodyEnd,
        x2: bodyEnd + Math.max(tipLength, MIN_TIP_LENGTH),
        d: Math.max(tipDiameter, MIN_TIP_DIAMETER),
      }
    : null;
  return {
    width: Math.ceil((tip?.x2 ?? bodyEnd) + 160),
    body: { x1: LEFT, x2: bodyEnd },
    cap: cap > 0 ? { x1: LEFT, x2: LEFT + cap } : null,
    tip,
    hasTipLength: tipLength > 0,
    hasTipDiameter: tipDiameter > 0,
    // La marca va hacia el final del cuerpo, como en el bolígrafo real.
    mark: mark > 0 ? { x1: LEFT + body * 0.55, x2: LEFT + body * 0.55 + mark } : null,
  };
}

/** Las partes que el dibujo muestra, en el orden de PEN_PARTS y sin repetidas. */
export function drawnParts(dimensions: readonly DimensionView[]): DimensionView[] {
  const g = penGeometry(dimensions);
  const drawn: Record<PenPart, boolean> = {
    body: hasPenDiagram(dimensions),
    cap: g.cap !== null,
    tip_length: g.hasTipLength,
    tip_diameter: g.hasTipDiameter,
    mark: g.mark !== null,
  };
  return PEN_PARTS.flatMap((part) => {
    const d = dimensions.find((x) => x.partKey === part);
    return d && drawn[part] ? [d] : [];
  });
}

type DimensionDiagramProps = {
  /** id único en la página (los radios lo usan de nombre). */
  id: string;
  productName: string;
  dimensions: DimensionView[];
};

/** Etiqueta de una cota: más grande en móvil, donde el SVG se ve a la mitad de su tamaño. */
const LABEL = "cota-label fill-ink text-[17px] font-bold max-md:text-[26px]";

/**
 * Diagrama de medidas (docs/06 §3.4, docs/08 DimensionDiagram, BD-063): el bolígrafo con el tapón
 * separado y una cota por parte, dibujadas a escala desde ProductDimension (la punta, con un
 * mínimo para que se vea). Las partes son radios nativos («Largo del cuerpo 145.83 mm»), más
 * «Todas»: al elegir una, CSS (:has, motion.css) la resalta, dibuja su línea de cota y muestra su
 * valor (A-33); las demás se atenúan. Sin JS funciona igual; con «Todas» (al inicio) se ven todas.
 * Cero JS: la ficha está en su tope de presupuesto (docs/12 §2). Cada parte lleva
 * data-event="dimension_open" con su nombre (docs/12 §4). La tabla de la pestaña es la
 * alternativa accesible; el SVG es una imagen con nombre.
 */
export function DimensionDiagram({ id, productName, dimensions }: DimensionDiagramProps) {
  const t = productPage.dimensions;
  const g = penGeometry(dimensions);
  const parts = drawnParts(dimensions);
  const value = (part: PenPart) => {
    const d = dimensions.find((x) => x.partKey === part);
    return d ? t.mm(d.valueMm, d.tolerance) : "";
  };
  const y = { cap: 66, body: 160 };
  const tick = (x: number, cy: number) => `M${x} ${cy - 6}v12`;

  return (
    <div className="dimension-diagram flex flex-col gap-4">
      <svg
        viewBox={`0 0 ${g.width} 260`}
        role="img"
        aria-label={t.diagramLabel(productName)}
        className="h-auto w-full max-w-3xl"
      >
        {/* Tapa (arriba, separada) y su cota. */}
        {g.cap ? (
          <g data-part="cap">
            <rect
              x={g.cap.x1}
              y={y.cap - 12}
              width={g.cap.x2 - g.cap.x1}
              height="24"
              rx="5"
              className="fill-soft stroke-muted"
              strokeWidth="2"
            />
            <path
              d={`M${g.cap.x1} ${y.cap - 26}H${g.cap.x2}`}
              pathLength="1"
              className="cota-line"
              strokeWidth="1.5"
            />
            <path
              d={`${tick(g.cap.x1, y.cap - 26)}${tick(g.cap.x2, y.cap - 26)}`}
              className="stroke-ink"
              strokeWidth="1.5"
            />
            <text
              x={(g.cap.x1 + g.cap.x2) / 2}
              y={y.cap - 36}
              textAnchor="middle"
              className={LABEL}
            >
              {value("cap")}
            </text>
          </g>
        ) : null}

        {/* Cuerpo (con el cono al final) y su cota, debajo. */}
        <g data-part="body">
          <path
            d={`M${g.body.x1} ${y.body - 15}H${g.body.x2 - CONE}l${CONE} 15-${CONE} 15H${g.body.x1}z`}
            className="fill-paper stroke-muted"
            strokeWidth="2"
          />
          <path
            d={`M${g.body.x1} ${y.body}H${g.body.x2}`}
            className="stroke-line-strong"
            strokeWidth="2"
          />
          <path
            d={`M${g.body.x1} ${y.body + 42}H${g.body.x2}`}
            pathLength="1"
            className="cota-line"
            strokeWidth="1.5"
          />
          <path
            d={`${tick(g.body.x1, y.body + 42)}${tick(g.body.x2, y.body + 42)}`}
            className="stroke-ink"
            strokeWidth="1.5"
          />
          <text
            x={(g.body.x1 + g.body.x2) / 2}
            y={y.body + 72}
            textAnchor="middle"
            className={LABEL}
          >
            {value("body")}
          </text>
        </g>

        {/* Marca impresa en el cuerpo: su cota justo encima. */}
        {g.mark ? (
          <g data-part="mark">
            <rect
              x={g.mark.x1}
              y={y.body - 7}
              width={g.mark.x2 - g.mark.x1}
              height="14"
              rx="2"
              className="fill-line-strong"
            />
            <path
              d={`M${g.mark.x1} ${y.body - 24}H${g.mark.x2}`}
              pathLength="1"
              className="cota-line"
              strokeWidth="1.5"
            />
            <path
              d={`${tick(g.mark.x1, y.body - 24)}${tick(g.mark.x2, y.body - 24)}`}
              className="stroke-ink"
              strokeWidth="1.5"
            />
            <text
              x={(g.mark.x1 + g.mark.x2) / 2}
              y={y.body - 34}
              textAnchor="middle"
              className={LABEL}
            >
              {value("mark")}
            </text>
          </g>
        ) : null}

        {/* Punta: la forma va con su largo; el diámetro, con su propia cota a la derecha. */}
        {g.tip ? (
          <g data-part="tip_length">
            <rect
              x={g.tip.x1}
              y={y.body - g.tip.d / 2}
              width={g.tip.x2 - g.tip.x1}
              height={g.tip.d}
              rx="2"
              className="fill-line-strong stroke-muted"
              strokeWidth="1.5"
            />
            {g.hasTipLength ? (
              <>
                <path
                  d={`M${g.tip.x1} ${y.body - 62}H${g.tip.x2}`}
                  pathLength="1"
                  className="cota-line"
                  strokeWidth="1.5"
                />
                <path
                  d={`${tick(g.tip.x1, y.body - 62)}${tick(g.tip.x2, y.body - 62)}`}
                  className="stroke-ink"
                  strokeWidth="1.5"
                />
                <text x={g.tip.x2} y={y.body - 72} textAnchor="end" className={LABEL}>
                  {value("tip_length")}
                </text>
              </>
            ) : null}
          </g>
        ) : null}
        {g.tip && g.hasTipDiameter ? (
          <g data-part="tip_diameter">
            <path
              d={`M${g.tip.x2 + 16} ${y.body - g.tip.d / 2}V${y.body + g.tip.d / 2}`}
              pathLength="1"
              className="cota-line"
              strokeWidth="1.5"
            />
            <path
              d={`M${g.tip.x2 + 10} ${y.body - g.tip.d / 2}h12M${g.tip.x2 + 10} ${y.body + g.tip.d / 2}h12`}
              className="stroke-ink"
              strokeWidth="1.5"
            />
            <text x={g.tip.x2 + 30} y={y.body + 6} textAnchor="start" className={LABEL}>
              {value("tip_diameter")}
            </text>
          </g>
        ) : null}
      </svg>

      <fieldset>
        <legend className="mb-2 text-[0.9375rem] font-bold text-ink">{t.choosePart}</legend>
        <div className="flex flex-wrap gap-2">
          {/* «Todas»: sin data-dimension-part, así el CSS vuelve a mostrar todas las cotas. */}
          <label className={CHIP}>
            <input type="radio" name={id} value="" defaultChecked className="sr-only" />
            <span className="font-bold">{t.allParts}</span>
          </label>
          {parts.map((d) => (
            <label key={d.partKey} className={CHIP}>
              <input
                type="radio"
                name={id}
                value={d.partKey}
                data-dimension-part={d.partKey}
                data-event="dimension_open"
                data-part={d.partKey}
                className="sr-only"
              />
              <span className="font-bold">{d.label}</span>
              {/* Espacio: el lector de pantalla lee «Largo del cuerpo 145.83 mm», no pegado. */}{" "}
              <span className="text-muted">{t.mm(d.valueMm, d.tolerance)}</span>
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  );
}

const CHIP =
  "flex min-h-11 cursor-pointer items-center gap-2 rounded-full border-2 border-line bg-paper px-4 text-sm has-checked:border-blue has-checked:bg-blue-50 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ink";
