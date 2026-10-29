"use client";

/**
 * Hero con capítulos de video (A-10 a A-13).
 * - El PÓSTER del primer capítulo es la imagen LCP (next/image con priority).
 * - Los videos se cargan DESPUÉS del evento load y en tiempo ocioso, solo si:
 *   no hay Save-Data, la conexión no es 2g/3g y no hay prefers-reduced-motion.
 * - En móvil se usa el video vertical (videoMobile) si existe.
 * - Pestañas accesibles (role="tablist"), flechas del teclado, botón de pausa.
 * - El video se pausa cuando el hero sale de pantalla.
 */
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

export type HeroChapterView = {
  key: string;
  label: string;
  hint: string;
  eyebrow: string;
  line: string;
  ctaLabel: string;
  ctaHref: string;           // para "quote" usar "#cotizar?tipo=empresa" y manejarlo en onCta
  ctaKind: "link" | "quote";
  ctaQuoteType?: string;
  videoDesktop?: string | null;
  videoMobile?: string | null;
  poster: { src: string; width: number; height: number; blurDataURL?: string; alt: string };
};

function canPlayVideo() {
  if (typeof window === "undefined") return false;
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  const c = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  if (c?.saveData) return false;
  if (c?.effectiveType && ["slow-2g", "2g", "3g"].includes(c.effectiveType)) return false;
  return true;
}

export function VideoHero({ chapters, onQuote }: { chapters: HeroChapterView[]; onQuote?: (type?: string) => void }) {
  const [current, setCurrent] = useState(0);
  const [videoOn, setVideoOn] = useState(false);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const videos = useRef<(HTMLVideoElement | null)[]>([]);
  const root = useRef<HTMLElement>(null);
  const visible = useRef(true);

  // 1) Habilitar video después de load + idle
  useEffect(() => {
    if (!canPlayVideo()) { setPaused(true); return; }
    const enable = () => {
      const ric = (window as Window & { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback;
      ric ? ric(() => setVideoOn(true)) : window.setTimeout(() => setVideoOn(true), 300);
    };
    if (document.readyState === "complete") enable();
    else window.addEventListener("load", enable, { once: true });
  }, []);

  // 2) Pausar fuera de pantalla
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      visible.current = !!e?.isIntersecting;
      const v = videos.current[current];
      if (!v) return;
      if (visible.current && !paused) v.play().catch(() => setPaused(true));
      else v.pause();
    }, { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, [current, paused]);

  // 3) Al cambiar de capítulo: reiniciar el actual y pausar los demás
  useEffect(() => {
    if (!videoOn) return;
    videos.current.forEach((v, i) => {
      if (!v) return;
      if (i === current) v.currentTime = 0;
      else v.pause();
    });
    setProgress(0);
  }, [current, videoOn]);

  // 4) Reproducir o pausar según el botón (sin reiniciar el video)
  useEffect(() => {
    if (!videoOn) return;
    const v = videos.current[current];
    if (!v) return;
    if (!paused && visible.current) v.play().catch(() => setPaused(true));
    else v.pause();
  }, [current, videoOn, paused]);

  const go = useCallback((i: number) => setCurrent((i + chapters.length) % chapters.length), [chapters.length]);

  const isMobile = typeof window !== "undefined" && matchMedia("(max-width: 860px)").matches;
  const ch = chapters[current]!;

  return (
    <section ref={root} className="hero" aria-label="Bolik, de la materia prima a tu primer trazo">
      <div className="hero__media" aria-hidden="true">
        {chapters.map((c, i) => (
          <div key={c.key} className="hero__layer" data-on={i === current || undefined}>
            <Image
              src={c.poster.src}
              alt=""
              fill
              sizes="100vw"
              priority={i === 0}
              fetchPriority={i === 0 ? "high" : "low"}
              placeholder={c.poster.blurDataURL ? "blur" : "empty"}
              blurDataURL={c.poster.blurDataURL}
              style={{ objectFit: "cover" }}
            />
            {videoOn && (c.videoDesktop || c.videoMobile) && (
              <video
                ref={(el) => { videos.current[i] = el; }}
                src={(isMobile && c.videoMobile) || c.videoDesktop || undefined}
                muted
                playsInline
                preload={i === current ? "auto" : "none"}
                onTimeUpdate={(e) => {
                  if (i !== current) return;
                  const v = e.currentTarget;
                  if (v.duration) setProgress(v.currentTime / v.duration);
                }}
                onEnded={() => { if (i === current && !paused) go(current + 1); }}
              />
            )}
          </div>
        ))}
      </div>
      <div className="hero__shade" />

      <div className="container-site hero__top">
        {videoOn && (
          <button type="button" className="hero__pause" onClick={() => setPaused((p) => !p)}
            aria-label={paused ? "Reproducir video" : "Pausar video"}>
            {paused ? "▶" : "❚❚"}
          </button>
        )}
      </div>

      <div className="container-site hero__main">
        <div className="hero__copy">
          <p className="chip chip--accent">60 años · Hecho en Guatemala</p>
          <h1 className="hero__title">
            De la materia prima a <em>tu primer trazo.</em>
          </h1>
          {/* key fuerza la animación A-12 en cada cambio de capítulo */}
          <div key={ch.key} className="hero__chapter" aria-live="polite">
            <p className="eyebrow hero__eyebrow">{ch.eyebrow}</p>
            <p className="hero__line">{ch.line}</p>
            <div className="hero__ctas">
              {ch.ctaKind === "quote" ? (
                <button type="button" className="btn btn--accent" onClick={() => onQuote?.(ch.ctaQuoteType)}>{ch.ctaLabel}</button>
              ) : (
                <Link className="btn btn--accent" href={ch.ctaHref}>{ch.ctaLabel}</Link>
              )}
              <Link className="btn btn--ghost-light" href="/productos">Ver catálogo</Link>
            </div>
          </div>
        </div>
      </div>

      <div className="container-site">
        <div className="hero__tabs" role="tablist" aria-label="Elige tu mundo Bolik"
          onKeyDown={(e) => {
            if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
            e.preventDefault();
            const next = (current + (e.key === "ArrowRight" ? 1 : -1) + chapters.length) % chapters.length;
            go(next);
            (e.currentTarget.children[next] as HTMLElement | undefined)?.focus();
          }}>
          {chapters.map((c, i) => (
            <button key={c.key} type="button" role="tab" aria-selected={i === current} tabIndex={i === current ? 0 : -1}
              className="hero__tab" onClick={() => go(i)}>
              <span className="hero__bar"><i style={{ transform: `scaleX(${i === current ? progress : 0})` }} /></span>
              <span className="hero__num">{String(i + 1).padStart(2, "0")}</span>
              <b>{c.label}</b>
              <span className="hero__hint">{c.hint}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

/* Notas de estilo (src/components/hero/video-hero.css o módulos):
 - .hero: min-height: clamp(600px, 84svh, 820px); display: flex; flex-direction: column; color: var(--paper); background: var(--navy)
 - .hero__layer: position:absolute; inset:0; opacity:0; transition: opacity var(--dur-slower) var(--ease-in-out)
   .hero__layer[data-on] { opacity: 1 }  ← crossfade A-10 (solo opacity)
   video dentro: position:absolute; inset:0; width:100%; height:100%; object-fit:cover
 - .hero__shade: gradiente izquierda→derecha + abajo→arriba con --navy para garantizar contraste AA del texto
 - .hero__chapter: animation: fade-up var(--dur-base) var(--ease-out)  ← A-12
 - .hero__bar i: display:block; height:3px; background: var(--yellow); transform-origin:left; transition: transform 120ms linear  ← A-13
   (se anima con transform: scaleX, NUNCA con width)
 - En < 860px: tabs con overflow-x:auto y scroll-snap; ocultar .hero__hint
*/
