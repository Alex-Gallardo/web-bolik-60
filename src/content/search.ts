import { featuredCatalog } from "./home";

/**
 * Textos del buscador (BD-066, docs/06 §3.6, doc 17 §5). Solo los descargan /buscar y el buscador
 * instantáneo, no el JS de todas las páginas.
 */
export const searchText = {
  metaTitle: "Buscar en el catálogo",
  metaDescription:
    "Busca útiles Bolik por nombre, código o código de barras: bolígrafos, lápices, crayones, marcadores y más.",
  title: "Buscar",
  label: featuredCatalog.searchLabel,
  placeholder: featuredCatalog.searchPlaceholder,
  button: featuredCatalog.searchButton,
  /** Título del buscador instantáneo (diálogo). */
  dialogTitle: "Buscar en el catálogo",
  /** Menos de 2 letras (doc 17 §5). */
  tooShort: "Escribe al menos 2 letras",
  results: (n: number, query: string) =>
    `${n.toLocaleString("es-GT")} ${n === 1 ? "resultado" : "resultados"} para «${query}»`,
  /** Coincidencia exacta de código (docs/06 §3.6). */
  exact: (name: string, sku: string) => `¿Buscas el ${name} (${sku})?`,
  exactCta: "Ver producto",
  codes: "Códigos",
  noResults: {
    title: (query: string) => `No encontramos «${query}»`,
    /** doc 17 §5: «Prueba con: Bolik Ultra · crayones · marcador de pizarra». */
    suggestionsLabel: "Prueba con:",
    suggestions: ["Bolik Ultra", "crayones", "marcador de pizarra"],
    whatsapp: "Pregúntanos por WhatsApp",
    catalog: { label: "Ver todo el catálogo", href: "/productos" },
  },
  /** Aviso del atajo de teclado en el diálogo. */
  shortcut: "Atajo: / o Ctrl+K (⌘K en Mac)",
  /** Mientras se descarga el índice. */
  loading: "Cargando el buscador…",
  close: "Cerrar el buscador",
} as const;

/**
 * Sinónimos (docs/02: «lapicero» y «bolígrafo» valen igual en Guatemala). Sin tildes ni mayúsculas.
 * Se agregan los que pidan las búsquedas sin resultado (`search_no_results`, docs/07 §4).
 */
export const searchSynonyms: readonly (readonly string[])[] = [
  ["lapicero", "boligrafo"],
  ["lapiceros", "boligrafos"],
];
