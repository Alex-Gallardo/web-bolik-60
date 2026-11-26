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
  distributorCta: { label: "¿Tienes una librería? Vende Bolik", href: "/mayoreo#distribuidor" },
} as const;
