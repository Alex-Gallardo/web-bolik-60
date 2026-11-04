/**
 * Logo oficial de Bolik (docs/02 §2, BD-027). Un solo componente para todo el sitio.
 * - full: logo completo (BOLIK®, «Expresa tu talento.» y el trazo de crayón) para fondos claros.
 * - inverse: el mismo en blanco (el crayón conserva sus colores) para fondos navy y azul.
 * - wordmark: solo BOLIK®, en línea y en el color del texto (currentColor). Para tamaños chicos
 *   (encabezado, menú, splash), donde el lema no se lee; también es la versión de un color.
 * Archivos: public/brand/*.svg, optimizados con SVGO desde docs/referencia/marca (ver su README).
 * Mínimo 96 px de ancho; el área libre alrededor (la altura de la «B») la da quien lo coloca.
 *
 * El logo completo va con <img> y no con next/image: es un SVG que no se optimiza ni cambia de
 * ancho, y next/image es un componente cliente que sumaría JS a todas las páginas (el pie lleva
 * el logo) sin aportar nada; con el loader propio además avisa en desarrollo.
 */

type LogoVariant = "full" | "inverse" | "wordmark";

type LogoProps = {
  variant?: LogoVariant;
  /** Ancho en px (mínimo 96). */
  width?: number;
  className?: string;
};

const MIN_WIDTH = 96;
/** Proporciones de los viewBox recortados al contenido. */
const FULL_RATIO = 191.5 / 419;
const WORDMARK_RATIO = 98.5 / 398.5;

const FILES = { full: "/brand/bolik-logo.svg", inverse: "/brand/bolik-logo-white.svg" } as const;

/** Ancho pedido, nunca menor que el mínimo de marca (y un valor raro cae al por defecto). */
function logoWidth(width: number | undefined, fallback: number): number {
  return Math.max(MIN_WIDTH, Number.isFinite(width) ? width! : fallback);
}

export function Logo({ variant = "full", width, className }: LogoProps) {
  if (variant === "wordmark") {
    const w = logoWidth(width, 120);
    return (
      <svg
        role="img"
        aria-label="Bolik"
        viewBox="39.5 42.5 398.5 98.5"
        width={w}
        height={Math.round(w * WORDMARK_RATIO)}
        className={className}
      >
        <path
          fill="currentColor"
          fillRule="evenodd"
          d="M40.4 138v-15.5h10V61.1h-10V45.7h42.4q9.5 0 14.6 2.5 5.2 2.3 8.5 8a24 24 0 0 1 3.4 12.5q0 7-3 12-3 4.8-9.1 7.8 7.5 3.1 11.8 9.2 4.2 6 4.2 14 0 7-3 13t-9.6 9.6a32 32 0 0 1-15.8 3.7zm27.7-55.2h10.3q7.8 0 11-2.9 3.5-3 3.5-8.2 0-5.8-4.7-8.7-3-2-9.7-1.9H68.1zm0 39.7h11q8.7 0 12.5-3.3t3.8-9.3q0-5.8-4-9.3T79.3 97H68zm145.4-30.8q0 12.5-6.3 24a48.8 48.8 0 0 1-66 18.1 48.7 48.7 0 0 1-18-65.9A48.9 48.9 0 0 1 189.4 50a45 45 0 0 1 17.8 17.8 49 49 0 0 1 6.3 23.8m-18 0q0-12.9-9-21.7-8.8-8.9-21.4-8.9t-21.5 9-8.9 21.7 9 21.8 21.5 9q12.4 0 21.4-9t9-22M262 110h17.7v28L212 138v-14.7h10.2V60.4H212V45.8h37.9v14.6h-10v61.9h22zm52-49.7v63h10.2V138h-38v-14.7h10.2V60.4H286V45.8H324v14.6zm105.3 63V138H379v-14.6h9.3l-29.8-28.7v28.7h10V138h-37.8v-14.7h10V60.4h-10.1V45.8h37.9v14.6h-10v27.2L387 60.5h-8.2V45.8h38l.1 14.7h-7.9l-32.9 30.3 34.5 32.6zM428.7 45.5a8 8 0 0 1 3.8 1q1.9 1 3 2.9a8 8 0 0 1 0 7.9 8 8 0 0 1-13.6 0 8 8 0 0 1 0-7.9 7 7 0 0 1 2.9-2.9 8 8 0 0 1 3.8-1m0 1.5q-1.6 0-3.1.8a6.4 6.4 0 0 0 0 11 6.3 6.3 0 1 0 3-11.8M425 57.6v-8.4h4.4q.8.1 1.3.4t.7.8.4 1.2q0 .9-.6 1.5t-1.7.8l.6.3.6.7.6 1 1 1.7h-2.1l-.7-1.4q-.7-1.4-1.2-1.7t-1.2-.4h-.4v3.5zm1.7-4.8h2.5l.6-.5a1 1 0 0 0 0-1.2l-.6-.4-1.8-.2h-.7z"
        />
      </svg>
    );
  }
  const w = logoWidth(width, 200);
  return (
    // eslint-disable-next-line @next/next/no-img-element -- SVG estático sin optimizar (ver arriba).
    <img
      src={FILES[variant]}
      alt="Bolik"
      width={w}
      height={Math.round(w * FULL_RATIO)}
      loading="lazy"
      decoding="async"
      className={className}
    />
  );
}
