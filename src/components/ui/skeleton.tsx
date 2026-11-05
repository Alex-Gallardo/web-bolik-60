import { cx } from "class-variance-authority";

type SkeletonProps = { className?: string };

/**
 * Bloque de carga con brillo (A-70, .skeleton de motion.css): para contenido que carga en el
 * cliente. Decorativo: quien lo usa anuncia la carga (aria-busy en el contenedor). El tamaño lo da
 * className, igual al del contenido final, así no hay saltos (CLS).
 */
export function Skeleton({ className }: SkeletonProps) {
  return <div aria-hidden="true" className={cx("skeleton", className)} />;
}
