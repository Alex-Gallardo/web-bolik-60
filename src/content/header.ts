/**
 * Textos del header y del menú (docs/17 §1; estructura de docs/06 §2, BD-041). Las rutas existen a
 * medida que llegan sus páginas: mientras tanto los enlaces van sin precarga.
 *
 * Módulo aparte de content/ui (BD-047): las islas del header (contador, buscador, menús) lo
 * importan directo y así el resto de `ui` no viaja en el JS de todas las páginas. El servidor lo
 * sigue leyendo como `ui.header` y `ui.lines`.
 */
const QUOTE_LABEL = "Mi cotización";

export const headerText = {
  /** «Productos» abre el menú de categorías; el resto del menú va en nav. */
  products: { label: "Productos", href: "/productos" },
  nav: [
    { label: "Dónde comprar", href: "/donde-comprar" },
    { label: "Escuelas", href: "/escuelas" },
    { label: "Mayoreo", href: "/mayoreo" },
    { label: "Empresas", href: "/empresas" },
    { label: "Nosotros", href: "/nuestra-historia" },
  ],
  /** Botón principal del header. */
  cta: { label: "Cotizar", href: "/mayoreo" },
  home: "Bolik, inicio",
  navLabel: "Menú principal",
  search: { label: "Buscar", href: "/buscar" },
  quote: { label: QUOTE_LABEL, href: "/cotizacion" },
  /** Nombre accesible del contador: «Mi cotización, 3 productos». */
  quoteCount: (n: number) =>
    n === 0 ? QUOTE_LABEL : `${QUOTE_LABEL}, ${n} ${n === 1 ? "producto" : "productos"}`,
  openMenu: "Abrir menú",
  menuTitle: "Menú",
  allProducts: "Ver todo el catálogo",
  whatsapp: "Escríbenos por WhatsApp",
  /** Aviso para lector de pantalla en enlaces que abren otra pestaña. */
  newTab: "(se abre en otra pestaña)",
} as const;

/** Nombre de cada línea de producto (docs/02, docs/06 §3.2). */
export const lineNames = {
  escritura: "Escritura",
  escolar: "Escolar",
  arte: "Arte",
  oficina: "Oficina",
} as const;
