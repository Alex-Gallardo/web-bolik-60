/**
 * Lo único de Motion que usan los componentes del sitio (BD-045): `m.*` y `AnimatePresence`,
 * siempre dentro de un MotionProvider. ESLint prohíbe importar `motion/react` fuera de
 * src/components/motion y, aquí dentro, el componente `motion` completo (no es diferido).
 */
export { AnimatePresence, m } from "motion/react";
