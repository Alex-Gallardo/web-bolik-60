/**
 * Página /donde-comprar (docs/17 §4 y §6, docs/06 §3.7, BD-080). Los textos de cada tarjeta de
 * tienda están en content/ui.ts (ui.cards); los avisos (sin resultados, departamento sin tiendas), en
 * feedback.stores.
 */
export const storesPage = {
  title: "Dónde comprar Bolik",
  /** docs/10 §1. */
  metaTitle: "Dónde comprar Bolik en Guatemala",
  /** docs/17 §6. */
  metaDescription:
    "Encuentra librerías, supermercados y cadenas con productos Bolik en tu departamento, o compra en línea en Walmart y La Torre.",
  intro: "Encuentra librerías, supermercados y cadenas con productos Bolik en tu departamento.",
  onlineTitle: "Compra en línea",
  buyAt: (name: string) => `Comprar en ${name}`,
  filters: {
    department: "Departamento",
    allDepartments: "Todos los departamentos",
    /** Sin JS: el formulario GET lleva al departamento elegido (BD-080). */
    submit: "Ver tiendas",
    search: "Buscar tienda por nombre",
  },
  /** «{n} tiendas en {departamento}» (docs/17 §4); sin departamento, solo el número. */
  count: (n: number, department?: string) => {
    const stores = `${n.toLocaleString("es-GT")} ${n === 1 ? "tienda" : "tiendas"}`;
    return department ? `${stores} en ${department}` : stores;
  },
  departmentsTitle: "Busca por departamento",
  /** Página de un departamento (BD-082, aprobado el 27 nov 2026; docs/17 §4 y §6, docs/10 §1). */
  department: {
    /**
     * h1 y título. El departamento de Guatemala lleva «el departamento de»: si no, repetiría el de
     * /donde-comprar («Dónde comprar Bolik en Guatemala», docs/10 §1).
     */
    title: (department: { slug: string; name: string }) =>
      `Dónde comprar Bolik en ${department.slug === "guatemala" ? "el departamento de Guatemala" : department.name}`,
    metaDescription: (name: string) =>
      `Tiendas y librerías con productos Bolik en ${name}: direcciones, teléfonos y cómo llegar. Útiles escolares hechos en Guatemala.`,
    nearbyTitle: "Departamentos cercanos",
    allStores: { label: "Ver todas las tiendas", href: "/donde-comprar" },
    distributorCta: {
      label: "¿No hay tienda cerca? Sé distribuidor Bolik",
      href: "/mayoreo#distribuidor",
    },
  },
  /** Mapa y «Usar mi ubicación» (BD-081, aprobado el 27 nov 2026; docs/17 §4). Avisos: feedback. */
  locate: "Usar mi ubicación",
  map: {
    /** Título del mapa: oculto en escritorio, visible en la hoja de móvil. */
    title: "Mapa de tiendas",
    open: "Ver mapa",
    loading: "Cargando mapa…",
    /** Pin de un departamento (lector de pantalla). */
    pin: (department: string, n: number) =>
      `${department}: ${n.toLocaleString("es-GT")} ${n === 1 ? "tienda" : "tiendas"}`,
    zoomIn: "Acercar",
    zoomOut: "Alejar",
    /** Atribución obligatoria de OpenStreetMap (licencia ODbL). */
    attribution:
      '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>',
  },
  distributorCta: { label: "¿Tienes una librería? Vende Bolik", href: "/mayoreo#distribuidor" },
} as const;
