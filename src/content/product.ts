/**
 * Ficha de producto /productos/[categoria]/[producto] (docs/06 §3.4, docs/17 §3, BD-062). Solo la
 * usa el servidor; lo que necesita la isla de compra va en product-purchase.ts.
 */
export const productPage = {
  /** Migas: Inicio › Catálogo Bolik › {categoría} › {producto}. */
  breadcrumbs: {
    home: "Inicio",
    catalog: "Catálogo Bolik",
    catalogHref: "/productos",
    label: "Migas de pan",
  },
  /** Chip de marca del grupo (BD-038), cuando no es Bolik. */
  brandLabel: (brand: string) => `Marca ${brand}`,
  gallery: {
    label: "Fotos del producto",
    /** Nombre de cada miniatura (la foto en sí ya tiene su alt). */
    thumb: (n: number, total: number) => `Foto ${n} de ${total}`,
    /** Sin fotos todavía: el cuadro muestra el color. */
    noPhoto: (name: string, color: string) => `${name} ${color.toLowerCase()}, sin foto todavía`,
  },
  /** docs/17 §3: «¿Cuántas {presentación} necesitas?» (con «Cuántos» si es masculina). */
  quantityQuestion: (plural: string, masculine: boolean) =>
    `¿${masculine ? "Cuántos" : "Cuántas"} ${plural} necesitas?`,
  /** Presentaciones de PACKAGING_LABELS con nombre masculino (blísteres, fardos, estuches…). */
  masculinePacks: [
    "blister1",
    "blister3",
    "blister5",
    "blister",
    "fardo",
    "sixpack",
    "estuche",
    "tubo",
    "bote",
  ] as readonly string[],
  /** docs/17 §3: «Color: {color} · Código {sku}». */
  colorLine: (color: string, sku: string) => `Color: ${color} · Código ${sku}`,
  barcodeLine: (barcode: string | null) =>
    barcode ? `Código de barras ${barcode}` : "Código de barras por confirmar",
  keyFacts: (name: string) => `Datos clave del ${name}`,
  benefitsTitle: "Beneficios",
  usesTitle: "Usos",
  tabs: {
    label: "Información del producto",
    specs: "Especificaciones",
    /** docs/17 §3: «Sección medidas: Medidas y empaque». */
    dimensions: "Medidas y empaque",
    distributors: "Para distribuidores",
    safety: "Seguridad",
  },
  dimensions: {
    /** Nombre del SVG (la tabla de abajo es su alternativa, BD-063). */
    diagramLabel: (name: string) => `Diagrama de medidas del ${name}`,
    /** docs/06 §3.4: al elegir una parte se resalta y muestra su valor. */
    choosePart: "Elige una parte para ver su medida",
    /** La opción que vuelve a mostrar todas las cotas. */
    allParts: "Todas",
    caption: (name: string) => `Medidas del ${name} en milímetros`,
    part: "Parte",
    value: "Medida",
    mm: (value: number, tolerance: string | null) =>
      `${value.toLocaleString("es-GT", { maximumFractionDigits: 2 })} mm${tolerance ? ` (${tolerance})` : ""}`,
  },
  distributors: {
    caption: "Medidas, peso y unidades de cada presentación",
    pack: "Presentación",
    units: "Unidades",
    inner: "Contiene",
    size: "Medidas (largo × ancho × alto)",
    weight: "Peso",
    innerValue: (n: number) => `${n.toLocaleString("es-GT")} empaques`,
    sizeValue: (l: number, w: number, h: number) =>
      `${[l, w, h].map((v) => v.toLocaleString("es-GT", { maximumFractionDigits: 2 })).join(" × ")} mm`,
    weightValue: (g: number) => `${g.toLocaleString("es-GT", { maximumFractionDigits: 2 })} g`,
    pending: "Por confirmar",
    cta: { label: "Cotizar por mayor", href: "/mayoreo" },
  },
  packagings: {
    title: "Presentaciones",
    units: (n: number) => `${n.toLocaleString("es-GT")} ${n === 1 ? "unidad" : "unidades"}`,
    codesTitle: "Códigos por color",
    codesCaption: (name: string) => `Código SAP y código de barras de cada color del ${name}`,
    color: "Color",
    sku: "Código",
    barcode: "Código de barras",
    pendingBarcode: "Por confirmar",
  },
  faqTitle: "Preguntas frecuentes",
  /** docs/17 §3: «Relacionados: También te puede servir» (BD-063). */
  relatedTitle: "También te puede servir",
  /** Bloque de docs/06 §3.4 y del ticket BD-063; el texto es el de «Dónde comprar» (docs/17 §2). */
  whereToBuyBlock: {
    title: "Dónde comprar este producto",
    chainsTitle: "Cadenas",
  },
  /** docs/17 §3: «Dónde comprar» (la página llega con BD-080). */
  whereToBuy: { label: "Dónde comprar", href: "/donde-comprar" },
} as const;
