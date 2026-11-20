/**
 * /productos (docs/17 §3 y §6, docs/10 §2, docs/06 §3.2, BD-060). Sin importar otros textos: la
 * isla de filtros lo lleva al navegador. El buscador usa los del catálogo destacado (home.ts) y el
 * estado vacío, los de feedback.ts: los pasa la página.
 */
export const catalogPage = {
  /** Title de docs/10 §2 (la plantilla agrega « · Bolik»). */
  metaTitle: "Catálogo de útiles escolares y de oficina",
  metaDescription:
    "Catálogo completo de Bolik: bolígrafos, lápices, crayones, marcadores y más, hechos en Guatemala. Filtra por uso y cotiza por mayor.",
  title: "Catálogo Bolik",
  intro:
    "Útiles escolares y de oficina fabricados en Guatemala. Filtra por uso o busca por código.",
  filters: {
    label: "Filtrar productos",
    groups: { linea: "Línea", uso: "Uso", color: "Color" },
    /** Botón de móvil: «Filtros» o «Filtros (2)». */
    open: (active: number) => (active > 0 ? `Filtros (${active})` : "Filtros"),
    sheetTitle: "Filtros",
    /** Botón del sheet con el contador en vivo: «Ver 12 productos». */
    apply: (n: number) => `Ver ${n} ${n === 1 ? "producto" : "productos"}`,
  },
  /** Contador de docs/17 §3: «12 productos». */
  count: (n: number) => `${n.toLocaleString("es-GT")} ${n === 1 ? "producto" : "productos"}`,
  categoriesTitle: "Categorías",
} as const;
