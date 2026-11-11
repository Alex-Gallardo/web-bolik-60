/**
 * Presets de Motion (BD-045, docs/09 §7) para `m.*` dentro de MotionProvider. Las duraciones y
 * curvas son los tokens de src/styles/motion.css (en segundos, como los pide Motion); una prueba
 * (motion.test.ts) exige que coincidan. El resorte de drawer y sheet no tiene duración: sus
 * parámetros son los de docs/09 §7. Con movimiento reducido, MotionConfig quita los
 * desplazamientos y la escala: por eso todos los presets también cambian la opacidad.
 */

/** --dur-fast, --dur-base y --dur-slow, en segundos. */
export const DUR = { fast: 0.16, base: 0.24, slow: 0.42 } as const;

/** --ease-out (entradas) y --ease-in (salidas). */
export const EASE = {
  out: [0.22, 1, 0.36, 1],
  in: [0.55, 0, 1, 0.45],
} as const satisfies Record<string, readonly [number, number, number, number]>;

/** Resorte de drawer y sheet (docs/09 §7). */
export const spring = { type: "spring", stiffness: 380, damping: 32, mass: 0.9 } as const;

/** Drawer lateral (escritorio, A-08). */
export const drawer = {
  initial: { x: "100%", opacity: 0 },
  animate: { x: 0, opacity: 1 },
  exit: { x: "100%", opacity: 0 },
  transition: spring,
} as const;

/** Bottom sheet (móvil, A-08). */
export const sheet = {
  initial: { y: "100%", opacity: 0 },
  animate: { y: 0, opacity: 1 },
  exit: { y: "100%", opacity: 0 },
  transition: spring,
} as const;

/** Aparecer y salir con escala breve (diálogos, A-09). */
export const fadeScale = {
  initial: { opacity: 0, scale: 0.96 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.98 },
  transition: { duration: DUR.base, ease: EASE.out },
} as const;

/** Quitar una línea de la cotización (A-36): se desvanece hacia la derecha. */
export const lineExit = {
  exit: { opacity: 0, x: 24, transition: { duration: DUR.base, ease: EASE.in } },
} as const;
