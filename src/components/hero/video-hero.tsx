import { getImageProps } from "next/image";
import { hero } from "@/content/home";
import type { HeroChapterView } from "@/server/data/types";
import { HeroPlayer, type PosterProps } from "./hero-player";

/**
 * Atributos del <img> de cada póster, calculados aquí con getImageProps de next/image (mismo
 * loader, srcset y sizes que <Image>): el componente de imagen de Next no viaja al navegador, que
 * en la home tiene el JS justo (docs/12 §2). Desde BD-056 la sección está más abajo: ningún póster
 * es el LCP, todos van diferidos y sin prioridad (HeroPlayer los monta al acercarse la sección).
 * Decorativo (alt vacío): el texto del capítulo dice lo mismo.
 */
function posterProps(chapter: HeroChapterView): PosterProps | null {
  if (!chapter.poster) return null;
  const { props } = getImageProps({
    src: chapter.poster.src,
    alt: "",
    fill: true,
    sizes: "100vw",
    loading: "lazy",
  });
  return {
    src: props.src,
    srcSet: props.srcSet,
    sizes: props.sizes,
    loading: props.loading,
    decoding: props.decoding,
  };
}

/**
 * Video por capítulos (docs/06 §3.1 sección 3; BD-050, bajó con BD-056). El h2 se arma aquí, en el
 * servidor; el póster, el video, el texto de cada capítulo y las pestañas los maneja HeroPlayer.
 * El h1 de la home está en el hero principal (MainHero).
 */
export function VideoHero({ chapters }: { chapters: HeroChapterView[] }) {
  if (chapters.length === 0) return null;
  const titleId = "video-titulo";
  return (
    <section aria-labelledby={titleId}>
      <HeroPlayer chapters={chapters} posters={chapters.map(posterProps)}>
        <h2
          id={titleId}
          className="font-display text-[length:var(--fs-h2)] leading-[var(--lh-heading)] font-extrabold text-paper"
        >
          {hero.title}
        </h2>
      </HeroPlayer>
    </section>
  );
}
