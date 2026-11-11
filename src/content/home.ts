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

/** Sección «Un Bolik para cada etapa» (docs/17 §2, docs/06 §3.1 sección 3, BD-051). */
export const solutions = {
  title: "Un Bolik para cada etapa",
} as const;

/** Catálogo destacado (docs/17 §2, docs/06 §3.1 sección 4, BD-051). */
export const featuredCatalog = {
  title: "Encuentra lo que necesitas",
  /**
   * «Más de 150 útiles» está por validar (docs/17): la cifra sale de SiteStat «productos» y solo
   * se dice cuando está publicada (la publica Mercadeo al validarla).
   */
  text: (products: number | null) =>
    products
      ? `Más de ${products.toLocaleString("es-GT")} útiles para la escuela, la oficina y la casa.`
      : "Útiles para la escuela, la oficina y la casa.",
  searchLabel: "Buscar en el catálogo",
  searchPlaceholder: "Busca por producto, código o código de barras",
  searchButton: "Buscar",
  searchAction: "/buscar",
  linesLabel: "Líneas de producto",
  /** Filtro por línea del catálogo (BD-060); la canónica sigue siendo /productos. */
  lineHref: (line: string) => `/productos?linea=${encodeURIComponent(line)}`,
  cta: { label: "Ver todo el catálogo", href: "/productos" },
} as const;

/**
 * Textos de la home (docs/17 «Soluciones · Un Bolik para cada etapa»; docs/06 §3.1). Un color por
 * público, cada uno con su texto AA (AudienceCard): amarillo con tinta; el resto con blanco.
 */
export const audiences = [
  {
    key: "colegios",
    title: "Colegios",
    text: "Útiles y actividades para que escribir sea divertido.",
    href: "/escuelas",
    tone: "yellow",
  },
  {
    key: "universidades",
    title: "Universidades",
    text: "Bolígrafos con el logo de tu facultad o asociación.",
    href: "/empresas",
    tone: "navy",
  },
  {
    key: "empresas",
    title: "Empresas",
    text: "Lapiceros personalizados para eventos y equipos.",
    href: "/empresas",
    tone: "blue",
  },
  {
    key: "librerias",
    title: "Librerías",
    text: "Precio de fábrica por cajilla y fardo.",
    href: "/mayoreo",
    tone: "green",
  },
  {
    key: "distribuidores",
    title: "Distribuidores",
    text: "Lleva Bolik a tu municipio.",
    href: "/mayoreo#distribuidor",
    tone: "red",
  },
] as const;
