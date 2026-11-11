import { getImageProps } from "next/image";
import type { CSSProperties } from "react";
import { preload } from "react-dom";
import { hero } from "@/content/home";
import type { HeroChapterView } from "@/server/data/types";
import { HeroPlayer, type PosterProps } from "./hero-player";

/**
 * Atributos del <img> de cada póster, calculados aquí con getImageProps de next/image (mismo
 * loader, srcset y sizes que <Image>): el componente de imagen de Next no viaja al navegador, que
 * en la home tiene el JS justo (docs/12 §2). El póster 1 es el LCP: se pide de inmediato y con
 * prioridad alta (`preload` de Next 16 solo agrega un <link> sin prioridad: Chrome lo pedía Low).
 * Decorativo (alt vacío): el texto del capítulo dice lo mismo.
 */
function posterProps(chapter: HeroChapterView, index: number): PosterProps | null {
  if (!chapter.poster) return null;
  const { props } = getImageProps({
    src: chapter.poster.src,
    alt: "",
    fill: true,
    sizes: "100vw",
    loading: index === 0 ? "eager" : "lazy",
    fetchPriority: index === 0 ? "high" : undefined,
  });
  return {
    src: props.src,
    srcSet: props.srcSet,
    sizes: props.sizes,
    loading: props.loading,
    fetchPriority: props.fetchPriority,
    decoding: props.decoding,
  };
}

/**
 * Hero de la home (docs/06 §3.1, BD-050). El chip y el único h1 de la página se arman aquí, en el
 * servidor, y no cambian con el capítulo; el póster, el video, el texto de cada capítulo y las
 * pestañas los maneja HeroPlayer. El subrayado de tinta (A-11) se dibuja con stroke-dashoffset
 * (.ink-draw): con movimiento reducido queda fijo al instante.
 */
export function VideoHero({ chapters }: { chapters: HeroChapterView[] }) {
  const posters = chapters.map(posterProps);
  const lcp = posters[0];
  // <link rel="preload"> en el <head> con prioridad alta: el navegador pide el póster 1 junto con
  // el CSS, antes de llegar al <img> del cuerpo.
  if (lcp?.srcSet) {
    preload(lcp.src, {
      as: "image",
      imageSrcSet: lcp.srcSet,
      imageSizes: lcp.sizes,
      fetchPriority: "high",
    });
  }
  const heading = (
    <>
      <p className="w-fit rounded-full bg-yellow px-3 py-1 text-sm font-bold text-ink">
        {hero.chip}
      </p>
      <h1 className="font-display text-[length:var(--fs-hero)] leading-[var(--lh-heading)] font-extrabold text-paper">
        {hero.title.lead}{" "}
        <span className="relative inline-block whitespace-nowrap">
          {hero.title.emphasis}
          <svg
            viewBox="0 0 300 12"
            preserveAspectRatio="none"
            className="absolute -bottom-2 left-0 h-3 w-full"
            aria-hidden="true"
          >
            <path
              d="M3 8C60 3 118 11 178 6s92-3 119 1"
              pathLength={1}
              strokeWidth={4}
              strokeLinecap="round"
              className="ink-draw ink-draw-late fill-none stroke-yellow"
              style={{ "--path-length": 1 } as CSSProperties}
            />
          </svg>
        </span>
      </h1>
    </>
  );

  return (
    <section aria-label={hero.label}>
      {chapters.length > 0 ? (
        <HeroPlayer chapters={chapters} posters={posters}>
          {heading}
        </HeroPlayer>
      ) : (
        // Sin capítulos publicados (todos despublicados en el admin): el h1 sigue en su lugar.
        <div className="bg-navy text-paper">
          <div className="container-site flex flex-col gap-5 py-20">{heading}</div>
        </div>
      )}
    </section>
  );
}
