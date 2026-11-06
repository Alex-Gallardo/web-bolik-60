/**
 * Constantes del splash (BD-043, docs/09 §3), compartidas por el script de <head>
 * (app/head-script.ts), la demo de /styleguide y las pruebas E2E.
 */

/** Clave de sessionStorage: el splash ya se mostró en esta sesión. */
export const SPLASH_KEY = "bolik_splash";

/**
 * Duraciones en ms. `on` = --dur-splash; `reduced` = el logo quieto, sin animación; `out` = --dur-base
 * (fundido al saltarlo). El script termina con `animationend` del overlay; los temporizadores son
 * el respaldo (pestaña en segundo plano, animación que no llegó a correr) y llevan `margin` extra
 * para no cortar un fundido que empezó un poco después que el script.
 */
export const SPLASH_MS = { on: 2000, reduced: 500, out: 240, margin: 150 } as const;
