"use client";

import { cx } from "class-variance-authority";
import { useEffect, useLayoutEffect, useRef } from "react";

/** A-20 (docs/09): 1100 ms con ease-out cúbica. */
const DURATION = 1100;
const NUMBER = new Intl.NumberFormat("es-GT");

type CountUpProps = {
  value: number;
  /** Antes del número: «Q». */
  prefix?: string;
  /** Después del número: «+». */
  suffix?: string;
  /** Cuenta aunque ya esté en pantalla al montarse (demo de /styleguide al «Reproducir»). */
  animateOnMount?: boolean;
  className?: string;
};

const label = (n: number, prefix: string, suffix: string) =>
  `${prefix}${NUMBER.format(n)}${suffix}`;

/**
 * Cifra con conteo (A-20, BD-044). El HTML del servidor trae el número final: se ve sin JS, el
 * buscador lo lee y el lector de pantalla siempre oye el final (texto sr-only; lo animado va
 * aria-hidden). Al entrar en pantalla cuenta de 0 al valor; si ya estaba en pantalla al montar o
 * con movimiento reducido (real o simulado en /styleguide), se queda en el final.
 * Sin CLS: una copia invisible del número final reserva el ancho y el animado se dibuja encima,
 * alineado a la derecha (motion.css, .count-up).
 */
export function CountUp({
  value,
  prefix = "",
  suffix = "",
  animateOnMount = false,
  className,
}: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const final = label(value, prefix, suffix);
  // El final más reciente: si cambia el valor a media cuenta, la limpieza no escribe uno viejo.
  const latest = useRef(final);
  useLayoutEffect(() => {
    latest.current = final;
  });

  useEffect(() => {
    const el = ref.current;
    if (!el || !("IntersectionObserver" in window)) return;
    const reduced =
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      document.documentElement.hasAttribute("data-reduced-motion");
    const visible = el.getBoundingClientRect().top < window.innerHeight;
    if (reduced || (visible && !animateOnMount)) return;
    let frame = 0;
    let counting = false;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        io.disconnect();
        counting = true;
        const start = performance.now();
        const tick = (now: number) => {
          const progress = Math.min(1, (now - start) / DURATION);
          const eased = 1 - (1 - progress) ** 3;
          el.textContent = label(Math.round(value * eased), prefix, suffix);
          if (progress < 1) frame = requestAnimationFrame(tick);
        };
        el.textContent = label(0, prefix, suffix);
        frame = requestAnimationFrame(tick);
      },
      { threshold: 0.6 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(frame);
      if (counting) el.textContent = latest.current;
    };
  }, [value, prefix, suffix, animateOnMount]);

  return (
    <span className={cx("count-up tnum", className)}>
      <span className="count-up__ghost" aria-hidden="true">
        {final}
      </span>
      <span ref={ref} className="count-up__value" aria-hidden="true">
        {final}
      </span>
      <span className="sr-only">{final}</span>
    </span>
  );
}
