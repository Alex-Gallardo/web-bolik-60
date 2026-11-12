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

/** Franja de cifras (docs/17 §2 «Cifras», docs/06 §3.1 sección 2, BD-052). */
export const stats = {
  /** Título para lector de pantalla: la franja se lee como su propia sección. */
  title: "Bolik en cifras",
} as const;

/** Producto estrella (docs/17 §2 «Bolik Ultra», docs/06 §3.1 sección 5, BD-052). */
export const spotlight = {
  /** «El favorito de Guatemala» está por validar: se usa la alternativa de docs/17. */
  eyebrow: "Nuestro bolígrafo estrella",
  colorsLabel: "Colores",
  packagingsLabel: "Presentaciones",
  benefitsLabel: "Beneficios",
  /**
   * products.json (docs/05 §6) y docs/17 coinciden en estos tres; el cuarto («Baja viscosidad» o
   * «Cuerpo hexagonal que no rueda») espera a Mercadeo (nota de BD-037).
   */
  benefitKeys: ["new-tip", "vented-cap", "water-resistant"],
  /** Código SAP del color: «Azul · PT00058». */
  colorChip: (name: string, sku: string) => `${name} · ${sku}`,
  viewProduct: "Ver ficha",
  /** Para lector de pantalla: «Ver ficha del Bolik Ultra» en la lista de enlaces. */
  viewProductOf: (name: string) => `del ${name}`,
  whereToBuy: { label: "Dónde comprar", href: "/donde-comprar" },
} as const;

/** «Bolik en tu escuela» (docs/17 §2, docs/06 §3.1 sección 6, BD-053). */
export const schools = {
  title: "Bolik en tu escuela",
  text: "Visitamos colegios con talleres de escritura, dibujo y creatividad. Tú pones las ganas; nosotros, los útiles.",
  cta: { label: "Lleva Bolik a tu escuela", href: "/escuelas" },
  activitiesLabel: "Actividades para escuelas",
} as const;

/** «Mayoreo y empresas» (docs/17 §2, docs/06 §3.1 sección 7, BD-053). */
export const wholesale = {
  /** Solo para lector de pantalla: cada tarjeta lleva su propio título. */
  title: "Mayoreo y empresas",
  cards: [
    {
      key: "mayoreo",
      eyebrow: "Librerías y distribuidores",
      title: "Compra directo de fábrica.",
      text: "Precio por cajilla y fardo, ejecutivo por zona y preventa escolar.",
      cta: "Cotizar por mayor",
      href: "/mayoreo",
      tone: "blue",
    },
    {
      key: "empresas",
      eyebrow: "Empresas y universidades",
      title: "Tu logo, en manos de todos.",
      text: "Bolígrafos personalizados para eventos, ferias y kits de bienvenida.",
      cta: "Cotizar personalizados",
      href: "/empresas",
      tone: "navy",
    },
  ],
} as const;

/** «Dónde comprar» (docs/17 §2, docs/06 §3.1 sección 8, BD-053). */
export const whereToBuy = {
  title: "Bolik está cerca de ti",
  text: "Encuéntranos en librerías, supermercados y cadenas de todo el país, o compra en línea.",
  selectLabel: "Elige tu departamento",
  submit: "Ver tiendas",
  /**
   * Formulario GET sin JS: /donde-comprar (BD-080) lleva ?departamento=x a /donde-comprar/x
   * (BD-082).
   */
  action: "/donde-comprar",
  onlineLabel: "Compra en línea",
  buyAt: (name: string) => `Comprar en ${name}`,
  allStores: { label: "Ver todas las tiendas", href: "/donde-comprar" },
} as const;

/** Historia (docs/17 §2, docs/06 §3.1 sección 10, BD-053). */
export const history = {
  title: "60 años escribiendo con Guatemala",
  cta: { label: "Conoce nuestra historia", href: "/nuestra-historia" },
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
