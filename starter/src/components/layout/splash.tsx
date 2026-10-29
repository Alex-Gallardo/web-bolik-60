/**
 * Splash de bienvenida (A-01) · Server Component, CERO JavaScript de React.
 *
 * Cómo funciona:
 * 1. `splashScript` corre en <head> antes de pintar. Decide si mostrar el splash:
 *    solo primera visita de la sesión, solo si se aterriza en "/", nunca a crawlers,
 *    y si el ajuste splash_enabled está activo (data-splash-enabled en <html>).
 * 2. Si se muestra, pone data-splash="on" (o "reduced") en <html>. El CSS hace visible
 *    el overlay y lo anima. El hero ya está renderizado debajo (no afecta SEO ni LCP).
 * 3. A los 2 s (o al tocar/pulsar Escape) el script quita el atributo y el overlay desaparece.
 *
 * Uso en src/app/layout.tsx:
 *   <html lang="es-GT" data-splash-enabled={settings.splashEnabled ? "true" : "false"} …>
 *     <head><script dangerouslySetInnerHTML={{ __html: splashScript }} /></head>
 *     <body><Splash /> …</body>
 */

export const splashScript = `(function(){try{
var d=document.documentElement;d.classList.add('js');
var ua=navigator.userAgent||'';
var bot=/bot|crawl|spider|slurp|bingpreview|facebookexternalhit|whatsapp|preview/i.test(ua);
if(bot||d.getAttribute('data-splash-enabled')==='false'||location.pathname!=='/'||sessionStorage.getItem('bolik_splash'))return;
sessionStorage.setItem('bolik_splash','1');
var reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
d.setAttribute('data-splash',reduced?'reduced':'on');
var done=function(){d.removeAttribute('data-splash');removeEventListener('keydown',onKey);};
var onKey=function(e){if(e.key==='Escape')done();};
addEventListener('keydown',onKey);
document.addEventListener('pointerdown',function(e){if(e.target&&e.target.closest&&e.target.closest('.splash'))done();},{once:true});
setTimeout(done,reduced?500:2000);
}catch(e){}})();`;

export function Splash() {
  return (
    <div className="splash" aria-hidden="true">
      <div className="splash__inner">
        <svg className="splash__mark" viewBox="0 0 120 120" width="112" height="112">
          <rect className="splash__box" x="4" y="4" width="112" height="112" rx="28" />
          <path className="splash__ink" d="M24 78 C 40 70, 48 44, 62 44 S 74 70, 96 64" pathLength={1} />
        </svg>
        <p className="splash__word">bolik</p>
        <p className="splash__tag">60 años · 1966–2026</p>
      </div>
    </div>
  );
}

/* Estilos (agregar a src/styles/splash.css e importarlo en globals.css):

.splash { display: none; }
html[data-splash] body { overflow: hidden; }
html[data-splash] .splash {
  display: grid; place-items: center;
  position: fixed; inset: 0; z-index: var(--z-splash);
  background-color: var(--navy);
  background-image: radial-gradient(rgb(255 255 255 / .08) 1px, transparent 1.4px);
  background-size: 22px 22px;
  color: var(--paper);
  animation: splash-out 380ms var(--ease-in) 1620ms both;
}
html[data-splash="reduced"] .splash { animation: splash-out 200ms linear 300ms both; }
.splash__inner { display: grid; justify-items: center; gap: 12px; }
.splash__box { fill: var(--blue); transform-box: fill-box; transform-origin: center; animation: scale-in 420ms var(--ease-spring) both; }
.splash__ink { fill: none; stroke: var(--yellow); stroke-width: 9; stroke-linecap: round;
  stroke-dasharray: 1; stroke-dashoffset: 1; animation: splash-draw 700ms var(--ease-out) 300ms forwards; }
.splash__word { font: 800 44px/1 var(--font-display); letter-spacing: -0.03em; animation: fade-up 420ms var(--ease-out) 650ms both; }
.splash__tag { font: 700 13px var(--font-body); letter-spacing: var(--tracking-caps); text-transform: uppercase;
  color: var(--yellow); animation: fade-in 420ms var(--ease-out) 900ms both; }
@keyframes splash-draw { to { stroke-dashoffset: 0; } }
@keyframes splash-out { to { opacity: 0; visibility: hidden; } }
@media (prefers-reduced-motion: reduce) { .splash__box, .splash__ink, .splash__word, .splash__tag { animation: none; stroke-dashoffset: 0; } }
*/
