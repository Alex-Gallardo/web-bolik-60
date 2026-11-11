"use client";

import type { Route } from "next";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { buttonVariants } from "@/components/ui/button-variants";
import { hero } from "@/content/home";
import type { HeroChapterView } from "@/server/data/types";
import {
  canPlayVideo,
  HERO_MOBILE_QUERY,
  pickVideo,
  readVideoEnvironment,
  REDUCED_MOTION_QUERY,
} from "./video-policy";

/** Atributos del <img> de un póster: los calcula VideoHero en el servidor con getImageProps. */
export type PosterProps = {
  src: string;
  srcSet?: string;
  sizes?: string;
  loading?: "eager" | "lazy";
  fetchPriority?: "high" | "low" | "auto";
  decoding?: "async" | "auto" | "sync";
};

type HeroPlayerProps = {
  chapters: HeroChapterView[];
  /** Un póster por capítulo, en el mismo orden (null si el capítulo no tiene). */
  posters: (PosterProps | null)[];
  /** Chip y h1: los arma el servidor (VideoHero) y no cambian con el capítulo. */
  children: ReactNode;
};

// Las clases del botón sin <Button asChild>: Slot y los textos del botón no viajan al navegador.
const primaryCta = buttonVariants({ variant: "accent", block: true });
const secondaryCta = buttonVariants({ variant: "ghost-light", block: true });

const subscribeMobile = (onChange: () => void) => {
  const query = window.matchMedia(HERO_MOBILE_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};
const isMobileNow = () => window.matchMedia(HERO_MOBILE_QUERY).matches;
// En el servidor no se sabe: el HTML nunca trae video (solo llega después de `load`).
const isMobileOnServer = () => false;

/**
 * Hero con capítulos (A-10 a A-13, BD-050; docs/09 §5). El HTML del servidor trae el póster del
 * capítulo 1 (la imagen LCP), el texto y los CTA de los cuatro capítulos (sin JS se ven todos;
 * con JS, solo el activo: .js .hero-chapter en motion.css) y las pestañas.
 * - El video llega después de `load` y en tiempo ocioso, nunca con movimiento reducido (también si
 *   se activa después), ahorro de datos ni conexión lenta (video-policy.ts). En móvil solo hay
 *   video si el capítulo trae el vertical; si no, se queda el póster.
 * - Solo existe el <video> del capítulo actual (preload solo de ese). Los pósters de los demás
 *   capítulos se montan al visitarlos, y el del siguiente mientras corre un video, para que el
 *   cambio (A-10) no espere la descarga. Nada de eso se pide durante la carga inicial.
 * - Un video que no se puede reproducir (error) deja el póster: nunca una caja negra.
 * - Pestañas con flechas, Inicio y Fin; botón de pausa visible cuando el capítulo tiene video; el
 *   video se pausa fuera de pantalla. Al terminar un video pasa al siguiente capítulo, salvo en
 *   pausa o con el foco dentro del hero (el panel que tiene el foco no se oculta, WCAG 2.4.3).
 * - La barra de progreso (A-13) se mueve escribiendo el transform directo: timeupdate no
 *   vuelve a renderizar el hero.
 */
export function HeroPlayer({ chapters, posters, children }: HeroPlayerProps) {
  const id = useId();
  const panelId = (index: number) => `${id}-panel-${index}`;
  const tabId = (index: number) => `${id}-tab-${index}`;
  const [current, setCurrent] = useState(0);
  const [changed, setChanged] = useState(false);
  const [visited, setVisited] = useState<ReadonlySet<number>>(() => new Set([0]));
  const [videoOn, setVideoOn] = useState(false);
  const [paused, setPaused] = useState(false);
  const [failed, setFailed] = useState<ReadonlySet<number>>(() => new Set());
  const isMobile = useSyncExternalStore(subscribeMobile, isMobileNow, isMobileOnServer);
  const root = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const bars = useRef<(HTMLElement | null)[]>([]);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const visible = useRef(true);
  const focusInside = useRef(false);

  const count = chapters.length;
  const videoFor = (index: number) => {
    const chapter = chapters[index];
    if (!videoOn || !chapter || failed.has(index)) return null;
    return pickVideo(chapter, isMobile);
  };
  const currentVideo = videoFor(current);
  const next = (current + 1) % count;

  // El video solo después de load + tiempo ocioso: el póster ya es el LCP. Si después se activa
  // el movimiento reducido, el video se va.
  useEffect(() => {
    const reduced = window.matchMedia(REDUCED_MOTION_QUERY);
    const stop = () => {
      if (reduced.matches) setVideoOn(false);
    };
    reduced.addEventListener("change", stop);
    let idle = 0;
    let timer = 0;
    const enable = () => {
      // Safari no tiene requestIdleCallback.
      if (typeof window.requestIdleCallback === "function") {
        idle = window.requestIdleCallback(() => setVideoOn(true), { timeout: 2000 });
      } else {
        timer = window.setTimeout(() => setVideoOn(true), 300);
      }
    };
    if (canPlayVideo(readVideoEnvironment())) {
      if (document.readyState === "complete") enable();
      else window.addEventListener("load", enable, { once: true });
    }
    return () => {
      reduced.removeEventListener("change", stop);
      window.removeEventListener("load", enable);
      if (idle) window.cancelIdleCallback(idle);
      window.clearTimeout(timer);
    };
  }, []);

  // Reproduce o pausa según la pausa del usuario y si el hero está en pantalla.
  useEffect(() => {
    const element = video.current;
    if (!element) return;
    if (!paused && visible.current) {
      element.play().catch((error: unknown) => {
        // El navegador bloqueó la reproducción automática: queda en pausa y el botón lo dice.
        if ((error as { name?: string })?.name === "NotAllowedError") setPaused(true);
      });
    } else {
      element.pause();
    }
  }, [current, paused, currentVideo]);

  // Fuera de pantalla, el video se pausa (y no gasta batería ni datos).
  useEffect(() => {
    const element = root.current;
    if (!element || !currentVideo) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        visible.current = Boolean(entry?.isIntersecting);
        const playing = video.current;
        if (!playing) return;
        if (visible.current && !paused) playing.play().catch(() => {});
        else playing.pause();
      },
      { threshold: 0.15 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [currentVideo, paused]);

  // Al cambiar de capítulo, todas las barras vuelven a cero: la del nuevo la mueve su video.
  useEffect(() => {
    bars.current.forEach((bar) => {
      if (bar) bar.style.transform = "";
    });
  }, [current]);

  const go = useCallback(
    (index: number) => {
      const target = (index + count) % count;
      setCurrent(target);
      setChanged(true);
      setVisited((seen) => (seen.has(target) ? seen : new Set(seen).add(target)));
    },
    [count],
  );

  const onTabsKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    // Desde la pestaña que tiene el foco (puede no ser la activa si el video avanzó).
    const focused = tabs.current.findIndex((tab) => tab === event.target);
    const from = focused === -1 ? current : focused;
    const keys: Record<string, number> = {
      ArrowRight: from + 1,
      ArrowLeft: from - 1,
      Home: 0,
      End: count - 1,
    };
    const target = keys[event.key];
    if (target === undefined) return;
    event.preventDefault();
    const index = (target + count) % count;
    go(index);
    tabs.current[index]?.focus();
  };

  if (!chapters[current]) return null;

  return (
    <div
      ref={root}
      onFocus={() => {
        focusInside.current = true;
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          focusInside.current = false;
        }
      }}
      className="relative isolate flex min-h-[clamp(36rem,84svh,51rem)] flex-col overflow-hidden bg-navy text-paper"
    >
      <div className="absolute inset-0 -z-10" aria-hidden="true">
        {chapters.map((c, index) => {
          const showPoster =
            visited.has(index) || (Boolean(currentVideo) && index === next) || index === 0;
          const src = index === current ? currentVideo : null;
          const poster = posters[index];
          return (
            <div
              key={c.key}
              className="hero-layer absolute inset-0"
              data-on={index === current || undefined}
            >
              {poster && showPoster && (
                // Atributos de next/image (getImageProps, en VideoHero): mismo loader y srcset.
                // eslint-disable-next-line @next/next/no-img-element
                <img {...poster} alt="" className="absolute inset-0 size-full object-cover" />
              )}
              {src && (
                <video
                  key={src}
                  ref={video}
                  src={src}
                  muted
                  playsInline
                  // Con un solo capítulo no hay a dónde avanzar: el video se repite.
                  loop={count === 1}
                  preload="auto"
                  disablePictureInPicture
                  className="absolute inset-0 size-full object-cover"
                  onTimeUpdate={(event) => {
                    const { currentTime, duration } = event.currentTarget;
                    const bar = bars.current[index];
                    if (bar && duration) bar.style.transform = `scaleX(${currentTime / duration})`;
                  }}
                  onEnded={() => {
                    if (!paused && !focusInside.current) go(index + 1);
                  }}
                  onError={() => setFailed((seen) => new Set(seen).add(index))}
                />
              )}
            </div>
          );
        })}
        {/* Capas oscuras: contraste AA del texto y de las pestañas sobre cualquier cuadro
            (docs/09 §5). Abajo siempre navy (pestañas); en escritorio, además, a la izquierda. */}
        <div className="absolute inset-0 bg-linear-to-t from-navy via-navy/70 to-navy/40 md:via-navy/50 md:to-navy/0" />
        <div className="absolute inset-0 hidden bg-linear-to-r from-navy/90 via-navy/50 to-navy/0 md:block" />
      </div>

      {currentVideo && (
        // Absoluto: aparece cuando llega el video y no debe mover nada (CLS).
        <div className="absolute inset-x-0 top-4 z-10 container-site flex justify-end">
          <button
            type="button"
            onClick={() => setPaused((value) => !value)}
            aria-label={paused ? hero.play : hero.pause}
            className="press flex size-11 items-center justify-center rounded-full border-2 border-paper/60 bg-navy/60 text-paper hover:bg-navy"
          >
            <svg viewBox="0 0 24 24" className="size-5 fill-current" aria-hidden="true">
              {paused ? (
                <path d="M8 5.5v13l10.5-6.5z" />
              ) : (
                <path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" />
              )}
            </svg>
          </button>
        </div>
      )}

      <div className="container-site flex flex-1 flex-col justify-end gap-6 pt-16 pb-8 md:pb-10">
        <div className="flex max-w-2xl flex-col gap-5">
          {children}
          {chapters.map((c, index) => {
            const active = index === current;
            const primaryHref =
              c.cta.kind === "link" ? c.cta.href : hero.quoteHref(c.cta.quoteType);
            return (
              <div
                key={c.key}
                id={panelId(index)}
                role="tabpanel"
                aria-labelledby={tabId(index)}
                className="hero-chapter gap-4"
                data-active={active || undefined}
                // A-12: el texto entra animado al cambiar de capítulo; el primero ya está pintado.
                data-enter={(active && changed) || undefined}
              >
                <p className="text-sm font-bold tracking-wide text-yellow uppercase">{c.eyebrow}</p>
                <p className="max-w-xl text-[length:var(--fs-lead)] text-on-dark">{c.line}</p>
                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  {/* Sin precarga: varias rutas llegan con sus tickets de S2. */}
                  <Link
                    href={primaryHref as Route}
                    prefetch={false}
                    className={primaryCta}
                    data-event="hero_cta_click"
                    data-chapter={c.key}
                  >
                    {c.cta.label}
                  </Link>
                  {c.secondaryCta && (
                    <Link
                      href={c.secondaryCta.href as Route}
                      prefetch={false}
                      className={secondaryCta}
                      data-event="hero_cta_click"
                      data-chapter={c.key}
                    >
                      {c.secondaryCta.label}
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div
          role="tablist"
          aria-label={hero.tabsLabel}
          onKeyDown={onTabsKeyDown}
          // py-1: el anillo de foco no se recorta con el scroll horizontal.
          className="-mx-[var(--gutter)] flex snap-x scroll-px-[var(--gutter)] gap-2 overflow-x-auto px-[var(--gutter)] py-1 md:mx-0 md:grid md:grid-cols-4 md:overflow-visible md:px-0"
        >
          {chapters.map((c, index) => {
            const selected = index === current;
            return (
              <button
                key={c.key}
                ref={(element) => {
                  tabs.current[index] = element;
                }}
                id={tabId(index)}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls={panelId(index)}
                tabIndex={selected ? 0 : -1}
                onClick={() => go(index)}
                data-event="hero_chapter_view"
                data-chapter={c.key}
                className="flex min-h-11 min-w-36 shrink-0 snap-start flex-col gap-1 rounded-md px-1 pt-2 pb-1 text-left text-on-dark-muted hover:text-paper aria-selected:text-paper md:min-w-0"
              >
                <span className="block h-0.75 w-full overflow-hidden rounded-full bg-paper/25">
                  <span
                    ref={(element) => {
                      bars.current[index] = element;
                    }}
                    className="hero-bar block h-full bg-yellow"
                  />
                </span>
                <span className="flex items-baseline gap-2">
                  <span className="text-xs font-bold tabular-nums">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <b className="text-base">{c.label}</b>
                </span>
                <span className="hidden text-sm md:block">{c.hint}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
