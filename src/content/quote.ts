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
