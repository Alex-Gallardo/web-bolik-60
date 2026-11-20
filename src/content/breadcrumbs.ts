/**
 * Migas de pan (docs/06 §3, docs/10 §7, BD-093): los tramos que comparten todas las páginas. Cada
 * página agrega el suyo con su propio título. Solo lo usa el servidor (Breadcrumbs no tiene JS).
 */
export const breadcrumbsText = {
  /** Nombre del <nav> para lectores de pantalla. */
  label: "Migas de pan",
  home: { name: "Inicio", path: "/" },
  catalog: { name: "Catálogo Bolik", path: "/productos" },
} as const;
