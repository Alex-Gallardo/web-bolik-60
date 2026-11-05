/**
 * Script en línea de <head> (src/app/layout.tsx): corre antes de pintar. Hoy marca <html> con la
 * clase `js` (BD-025): lo que se oculta o anima solo con JS depende de ella y sin JS todo queda
 * visible. BD-043 le suma la decisión del splash (primera visita, sin bots, `splash_enabled`).
 * Un solo script: cada uno en <head> bloquea el pintado. La CSP permite scripts en línea.
 */
export const HEAD_SCRIPT = 'document.documentElement.classList.add("js")';
