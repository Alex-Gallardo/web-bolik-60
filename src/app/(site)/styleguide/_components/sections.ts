/** Las 13 secciones de /styleguide (docs/08 §6), en orden. El id es el ancla de cada una. */
export const SECTIONS = [
  { id: "marca", title: "Marca" },
  { id: "color", title: "Color" },
  { id: "tipografia", title: "Tipografía" },
  { id: "espacios", title: "Espacios, radios y sombras" },
  { id: "fondos", title: "Fondos" },
  { id: "botones", title: "Botones" },
  { id: "formularios", title: "Formularios" },
  { id: "tarjetas", title: "Tarjetas" },
  { id: "navegacion", title: "Navegación" },
  { id: "feedback", title: "Feedback" },
  { id: "movimiento", title: "Movimiento" },
  { id: "dominio", title: "Componentes de dominio" },
  { id: "iconos", title: "Íconos" },
] as const;

export type SectionId = (typeof SECTIONS)[number]["id"];
