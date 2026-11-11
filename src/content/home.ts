/**
 * Hero (docs/17 §2, docs/06 §3.1, BD-050): lo fijo. El texto de cada capítulo viene de HeroChapter.
 * El h1 es el único de la home; `emphasis` lleva el subrayado de tinta (A-11).
 */
export const hero = {
  label: "Bolik, de la materia prima a tu primer trazo",
  chip: "60 años · Hecho en Guatemala",
  title: { lead: "De la materia prima a", emphasis: "tu primer trazo." },
  tabsLabel: "Elige tu mundo Bolik",
  pause: "Pausar video",
  play: "Reproducir video",
  /** Hasta el drawer de cotización (BD-071), el CTA «quote» lleva a /cotizacion con el tipo. */
  quoteHref: (type: string) => `/cotizacion?tipo=${encodeURIComponent(type)}`,
} as const;

/**
 * Textos de la home (docs/17 «Soluciones · Un Bolik para cada etapa»; docs/06 §3.1). Un color por
 * público, cada uno con su texto AA (AudienceCard): amarillo con tinta; el resto con blanco.
 */
export const audiences = [
  {
    title: "Colegios",
    text: "Útiles y actividades para que escribir sea divertido.",
    href: "/escuelas",
    tone: "yellow",
  },
  {
    title: "Universidades",
    text: "Bolígrafos con el logo de tu facultad o asociación.",
    href: "/empresas",
    tone: "navy",
  },
  {
    title: "Empresas",
    text: "Lapiceros personalizados para eventos y equipos.",
    href: "/empresas",
    tone: "blue",
  },
  {
    title: "Librerías",
    text: "Precio de fábrica por cajilla y fardo.",
    href: "/mayoreo",
    tone: "green",
  },
  {
    title: "Distribuidores",
    text: "Lleva Bolik a tu municipio.",
    href: "/mayoreo#distribuidor",
    tone: "red",
  },
] as const;
