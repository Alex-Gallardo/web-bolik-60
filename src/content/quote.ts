/**
 * Textos del drawer de la cotización (BD-071, docs/06 §3.16, doc 17 §`/cotizacion`). Aparte de
 * ui.ts: solo los descarga el drawer, al primer uso, y no pesan en el JS de todas las páginas.
 * Los toasts (quitar, deshacer, vacía) están en content/feedback.ts.
 */
export const quoteDrawer = {
  title: "Mi cotización",
  /** Bajo el título: «3 productos». */
  summary: (n: number) => `${n.toLocaleString("es-GT")} ${n === 1 ? "producto" : "productos"}`,
  listLabel: "Productos de tu cotización",
  /** Etiqueta (solo lector de pantalla) del selector de cantidad de cada línea. */
  quantity: (name: string) => `Cantidad de ${name}`,
  remove: "Quitar",
  /** Nombre accesible del botón «Quitar» de una línea. */
  removeLabel: (name: string) => `Quitar ${name}`,
  send: { label: "Enviar cotización", href: "/cotizacion" },
  /** Nota bajo el botón (doc 17 §`/cotizacion`). */
  note: "No es una compra. Un ejecutivo te enviará precio y disponibilidad.",
  keepBrowsing: "Seguir viendo productos",
  catalog: { label: "Ver el catálogo", href: "/productos" },
} as const;

/**
 * Página /cotizacion (BD-072, docs/06 §3.16, doc 17 §`/cotizacion`). Los errores de campo están en
 * feedback.forms.errors y los avisos (enviar, error, vacía) en feedback.quote.
 */
export const quotePage = {
  metaTitle: "Mi cotización",
  metaDescription:
    "Revisa los productos de tu cotización y envíala: un ejecutivo de Bolik te responde con precio y disponibilidad en un día hábil.",
  title: "Mi cotización",
  listTitle: "Tus productos",
  formTitle: "Tus datos",
  /** Mientras el navegador lee la lista guardada (no se sabe en el servidor). */
  loading: "Cargando tu cotización…",
  /**
   * Sin JavaScript (doc 17 §5): la lista vive en el navegador y no hay nada que enviar. Con número
   * de WhatsApp en los ajustes, va como enlace (`whatsappLabel`).
   */
  noScript: "Para enviar este formulario activa JavaScript",
  noScriptWhatsApp: "o escríbenos por WhatsApp al",
  form: {
    customerType: "Tipo de cliente",
    customerOptions: [
      { value: "libreria", label: "Librería o tienda" },
      { value: "empresa", label: "Empresa" },
      { value: "colegio", label: "Colegio o universidad" },
      { value: "otro", label: "Otro" },
    ],
    organization: "Nombre de la institución",
    /** Con «Otro», la institución no es obligatoria. */
    optional: "(opcional)",
    name: "Tu nombre",
    phone: "Teléfono",
    email: "Correo",
    /** Bajo teléfono y correo. */
    phoneOrEmailHint: "Déjanos al menos uno de los dos.",
    department: "Departamento",
    departmentPlaceholder: "Elige tu departamento",
    municipality: "Municipio",
    notes: "Notas",
    notesHint: "¿Algo que debamos saber? Fechas, colores, entregas…",
    submit: "Enviar cotización",
    note: quoteDrawer.note,
  },
  empty: {
    catalog: quoteDrawer.catalog,
    kits: { label: "Ver kits escolares", href: "/kits-escolares" },
  },
} as const;
