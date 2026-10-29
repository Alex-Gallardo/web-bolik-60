"use client";

/**
 * Cifra con conteo animado (A-20). El HTML del servidor ya trae el número final
 * (SEO, sin JS, lector de pantalla). Al entrar en pantalla anima de 0 al valor.
 */
import { useEffect, useRef } from "react";

const fmt = new Intl.NumberFormat("es-GT");

export function CountUp({ value, prefix = "", suffix = "", duration = 1100 }: {
  value: number; prefix?: string; suffix?: string; duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const io = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return;
      io.disconnect();
      const t0 = performance.now();
      const tick = (t: number) => {
        const p = Math.min(1, (t - t0) / duration);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = `${prefix}${fmt.format(Math.round(value * eased))}${suffix}`;
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, { threshold: 0.6 });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [value, prefix, suffix, duration]);

  return (
    <span ref={ref} className="tnum">
      {prefix}{fmt.format(value)}{suffix}
    </span>
  );
}
