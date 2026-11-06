/**
 * Textos del pie y de los flotantes (BD-042). Archivo aparte de ui.ts a propósito: ui.ts lo importan
 * islas cliente del header y todo lo que tiene viaja en el JS de cada página; estos textos solo los
 * leen Server Components (footer.tsx, floating-actions.tsx, (site)/layout.tsx).
 */

/** docs/17 §5: el enlace del pie y el botón flotante. */
const BACK_TO_TOP = "Volver arriba";

/**
 * Pie del sitio (docs/17 §1; estructura de docs/06 §2, BD-042). Los datos de la empresa (razón
 * social, dirección, teléfono, horario, redes) vienen de SiteSetting, no de aquí.
 */
export const footerText = {
  tagline: "Útiles para escribir la historia de Guatemala desde 1966.",
  group: "Una marca de Grupo K-66",
  /** Columna de categorías: los enlaces salen del catálogo. */
  products: { title: "Productos", all: { label: "Ver todo el catálogo", href: "/productos" } },
  /** Familias: a los kits si están activos; si no, a dónde comprar (lo resuelve el pie). */
  forYou: {
    title: "Para ti",
    families: "Familias",
    links: [
      { label: "Escuelas", href: "/escuelas" },
      { label: "Librerías", href: "/mayoreo" },
      { label: "Empresas", href: "/empresas" },
    ],
  },
  bolik: {
    title: "Bolik",
    links: [
      { label: "Dónde comprar", href: "/donde-comprar" },
      { label: "Nuestra historia", href: "/nuestra-historia" },
      { label: "Preguntas frecuentes", href: "/preguntas-frecuentes" },
      { label: "Contacto", href: "/contacto" },
    ],
  },
  legal: {
    title: "Legal",
    links: [
      { label: "Privacidad", href: "/legal/privacidad" },
      { label: "Términos", href: "/legal/terminos" },
    ],
  },
  /** Nombre accesible del teléfono: «Llamar al +502 6628 2600». */
  call: (phone: string) => `Llamar al ${phone}`,
  facebook: "Facebook",
  copyright: (year: number) => `© ${year} Bolik. Hecho en Guatemala.`,
  backToTop: BACK_TO_TOP,
} as const;

/** Botones flotantes y barra de acciones en móvil (docs/06 §2 Flotantes, BD-042). */
export const floatingText = {
  label: "Acciones rápidas",
  whatsapp: "Escríbenos por WhatsApp",
  whatsappShort: "WhatsApp",
  /** Mensaje prellenado general (demo); las plantillas por producto y folio llegan con BD-067. */
  whatsappMessage: "Hola, Bolik. Quiero información sobre sus productos y precios por mayor.",
  backToTop: BACK_TO_TOP,
} as const;
