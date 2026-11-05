/**
 * Textos de la home (docs/17 «Soluciones · Un Bolik para cada etapa»; docs/06 §3.1). Un color por
 * público, cada uno con su texto AA (AudienceCard): amarillo con tinta; el resto con blanco.
 */
export const audiences = [
  {
    title: "Colegios",
    text: "Útiles y actividades para que escribir sea divertido.",
    href: "/escuelas",
    tone: "yellow",
  },
  {
    title: "Universidades",
    text: "Bolígrafos con el logo de tu facultad o asociación.",
    href: "/empresas",
    tone: "navy",
  },
  {
    title: "Empresas",
    text: "Lapiceros personalizados para eventos y equipos.",
    href: "/empresas",
    tone: "blue",
  },
  {
    title: "Librerías",
    text: "Precio de fábrica por cajilla y fardo.",
    href: "/mayoreo",
    tone: "green",
  },
  {
    title: "Distribuidores",
    text: "Lleva Bolik a tu municipio.",
    href: "/mayoreo#distribuidor",
    tone: "red",
  },
] as const;
