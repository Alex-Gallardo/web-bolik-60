import { Baloo_2, Bricolage_Grotesque, DM_Sans } from "next/font/google";

/**
 * Fuentes del sitio (docs/02): next/font las descarga en el build y las sirve desde el propio
 * servidor (sin peticiones a Google en el navegador). Variables, subset latin (incluye ñ y tildes).
 * Cada `variable` se aplica en <html> (o en el contenedor infantil, para Baloo 2).
 *
 * Sin el eje opsz: la home baja de 136 KB a 78 KB de fuentes. `axes: ["opsz"]` en Bricolage
 * (+36 KB) daría a los títulos grandes el diseño de display de la demo.
 */

/** Títulos. */
export const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-bricolage",
});

/**
 * Texto corrido. Sin precarga (BD-055): solo se precarga la de títulos, la del h1 de la home (el
 * LCP). La del texto se pide al resolver los estilos y puede pintarse primero con la fuente de
 * reserva (`swap`); CLS medido 0 en la home. El CLS de campo lo confirma en BD-126.
 */
export const dmSans = DM_Sans({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--font-dm-sans",
});

/**
 * Solo la sección infantil (/escuelas y su bloque en la home). Sin precarga: se descarga
 * únicamente en las páginas que la usan, nunca suma al LCP del resto del sitio.
 */
export const baloo = Baloo_2({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--font-baloo",
});
