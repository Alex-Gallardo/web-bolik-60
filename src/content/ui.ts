/**
 * Textos de interfaz que no son feedback (doc 17 §5): etiquetas de estado, botones genéricos.
 * Los toasts y diálogos viven en content/feedback.ts.
 */
/** Una sola instancia: «azul, rojo y negro». */
const LIST = new Intl.ListFormat("es-GT", { type: "conjunction" });

const QUOTE_LABEL = "Mi cotización";

export const ui = {
  /**
   * Header y menú (docs/17 §1; estructura de docs/06 §2, BD-041). Las rutas existen a medida que
   * llegan sus páginas: mientras tanto los enlaces van sin precarga.
   */
  header: {
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
  },
  /** Nombre de cada línea de producto (docs/02, docs/06 §3.2). */
  lines: { escritura: "Escritura", escolar: "Escolar", arte: "Arte", oficina: "Oficina" },
  /** Enlace para saltar al contenido con el teclado (docs/17 §1). */
  skipToContent: "Saltar al contenido",
  loading: {
    sending: "Enviando…",
    saving: "Guardando…",
    searching: "Buscando…",
    products: "Cargando productos…",
    uploading: "Subiendo imagen…",
    /** Nombre accesible de la barra de progreso de una subida. */
    uploadProgress: "Progreso de la subida",
  },
  /** Toaster y FriendlyDialog (BD-024): etiquetas, no mensajes (esos van en feedback.ts). */
  feedback: {
    /** Nombre de la región de avisos; sonner le agrega el atajo (Alt+T) para llegar a ellos. */
    region: "Avisos",
    closeToast: "Cerrar aviso",
    /** Botón principal cuando el mensaje no trae uno. */
    ok: "Entendido",
  },
  /** Botones del selector de cantidad (nombre accesible; en pantalla se ven − y +). */
  quantity: {
    decrease: "Quitar uno",
    increase: "Agregar uno",
  },
  /** Tarjetas del catálogo y de tiendas (doc 17 §3 y §4). */
  cards: {
    viewProduct: "Ver producto",
    products: (n: number) => `${n.toLocaleString("es-GT")} ${n === 1 ? "producto" : "productos"}`,
    colors: (names: string[]) =>
      `${names.length === 1 ? "Color" : "Colores"}: ${LIST.format(names.map((n) => n.toLowerCase()))}`,
    /** Antes del chip de marca, solo para lector de pantalla: «Marca: Fabik» (BD-038). */
    brand: "Marca:",
    /** Puntos de color que no caben en la tarjeta: «+3». */
    moreColors: (n: number) => `+${n}`,
    directions: "Cómo llegar",
    call: "Llamar",
    buyOnline: "Comprar en línea",
    /** Contexto solo para lectores de pantalla: «Cómo llegar a Tulán», «Comprar en línea en Tulán». */
    toStore: (name: string) => `a ${name}`,
    inStore: (name: string) => `en ${name}`,
    newTab: "(se abre en otra pestaña)",
    unverified: "Datos por confirmar",
    storeTypes: { cadena: "Cadena", libreria: "Librería", distribuidor: "Distribuidor" },
  },
  /** Prefijo de país del campo de teléfono, para lectores de pantalla. */
  phonePrefix: "Código de país +502, Guatemala",
  /** Sheet, Dialog y Popover (BD-025). */
  overlays: {
    close: "Cerrar",
  },
} as const;
