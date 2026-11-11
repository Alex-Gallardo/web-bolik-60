/**
 * Cuándo y qué video reproduce el hero (BD-050, docs/09 §5). Funciones puras: el componente les
 * pasa lo que lee del navegador y las pruebas, cualquier combinación.
 */

/**
 * Debajo de md (48rem, el corte del diseño del hero y de ui/tabs.tsx) el hero usa el video vertical
 * o ninguno; desde md, el 16:9.
 */
export const HERO_MOBILE_QUERY = "(max-width: 47.99rem)"; // sin sintaxis de rangos: Safari < 16.4
export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

export type VideoEnvironment = {
  /** prefers-reduced-motion real o simulado en /styleguide (data-reduced-motion). */
  reducedMotion: boolean;
  /** navigator.connection.saveData. */
  saveData?: boolean;
  /** navigator.connection.effectiveType: «slow-2g», «2g», «3g», «4g». */
  effectiveType?: string;
};

const SLOW = new Set(["slow-2g", "2g", "3g"]);

/** Sin video con movimiento reducido, con ahorro de datos o con una conexión lenta. */
export function canPlayVideo({
  reducedMotion,
  saveData,
  effectiveType,
}: VideoEnvironment): boolean {
  if (reducedMotion || saveData) return false;
  return !(effectiveType && SLOW.has(effectiveType));
}

/**
 * El video de un capítulo según el ancho: en escritorio el 16:9; en móvil solo el vertical (sin
 * él se queda el póster: un 16:9 recortado en vertical gasta datos para verse mal, docs/06 §3.1).
 */
export function pickVideo(
  chapter: { videoDesktop: string | null; videoMobile: string | null },
  isMobile: boolean,
): string | null {
  return isMobile ? chapter.videoMobile : chapter.videoDesktop;
}

/** Lee el entorno real del navegador (solo en el cliente). */
export function readVideoEnvironment(): VideoEnvironment {
  const connection = (
    navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }
  ).connection;
  return {
    reducedMotion:
      window.matchMedia(REDUCED_MOTION_QUERY).matches ||
      document.documentElement.hasAttribute("data-reduced-motion"),
    saveData: connection?.saveData,
    effectiveType: connection?.effectiveType,
  };
}
