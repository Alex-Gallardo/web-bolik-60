/**
 * /llms.txt — resumen del sitio en Markdown para asistentes de IA (propuesta llmstxt.org).
 * Se genera desde la BD con la misma caché/tags que el sitio. Ver docs/11.
 * /llms-full.txt sigue el mismo patrón pero incluye el texto completo de fichas y FAQs.
 */
import { SITE } from "@/features/seo/metadata";
import { getLlmsData } from "@/server/data/llms"; // 'use cache' + cacheTag(products, stores, content)

export async function GET() {
  const { categories, products, faqs, departmentsWithStores } = await getLlmsData();
  const abs = (p: string) => new URL(p, SITE.url).toString();

  const lines: string[] = [
    "# Bolik",
    "",
    `> ${SITE.description}`,
    "",
    "Bolik es una marca guatemalteca de útiles de escritura, escolares y de oficina, fabricada en San José Villa Nueva, Guatemala, desde junio de 1966 (originalmente Fábrica de Bolígrafos K-66, hoy parte de Grupo K-66). Se vende en librerías, supermercados y cadenas de Guatemala y El Salvador. El sitio no vende en línea: indica dónde comprar y recibe cotizaciones por mayor.",
    "",
    "## Datos clave",
    "- Fundación: junio de 1966, Guatemala",
    `- Planta: ${SITE.address.streetAddress}, ${SITE.address.addressLocality}, Guatemala`,
    `- Teléfono: ${SITE.phone}`,
    "- Producto emblemático: Bolik Ultra (bolígrafo hexagonal, punta mediana 1.0 mm, tinta azul PT00058, negra PT00059 y roja PT00060)",
    "- Presentaciones de mayoreo: blister de 1, 3 y 5 unidades; cajilla de 12; fardo de 100 cajillas",
    "",
    "## Productos",
    ...categories.flatMap((c) => [
      `- [${c.name}](${abs(`/productos/${c.slug}`)}): ${c.shortText}`,
      ...products
        .filter((p) => p.categorySlug === c.slug)
        .map((p) => `  - [${p.name}](${abs(`/productos/${c.slug}/${p.slug}`)}): ${p.shortDescription}`),
    ]),
    "",
    "## Dónde comprar",
    `- [Dónde comprar Bolik](${abs("/donde-comprar")}): mapa y lista de librerías y cadenas por departamento; compra en línea en Walmart Guatemala y La Torre.`,
    ...departmentsWithStores.map((d) => `- [${d.name}](${abs(`/donde-comprar/${d.slug}`)}): ${d.storeCount} puntos de venta`),
    "",
    "## Empresas, mayoreo y escuelas",
    `- [Mayoreo](${abs("/mayoreo")}): precios por cajilla y fardo para librerías y distribuidores; solicitud de distribuidor.`,
    `- [Empresas](${abs("/empresas")}): bolígrafos personalizados con logo.`,
    `- [Bolik en tu escuela](${abs("/escuelas")}): talleres y actividades de escritura en colegios.`,
    `- [Kits escolares](${abs("/kits-escolares")}): kits por grado.`,
    "",
    "## Preguntas frecuentes",
    ...faqs.slice(0, 15).map((f) => `- **${f.question}** ${f.answer}`),
    "",
    "## Opcional",
    `- [Historia](${abs("/nuestra-historia")})`,
    `- [Contacto](${abs("/contacto")})`,
    `- [Texto completo para IA](${abs("/llms-full.txt")})`,
    "",
  ];

  return new Response(lines.join("\n"), {
    headers: { "Content-Type": "text/markdown; charset=utf-8", "Cache-Control": "public, max-age=3600" },
  });
}
