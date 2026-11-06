import { SPLASH_KEY, SPLASH_MS } from "@/lib/splash";

/**
 * Script en línea de <head> (src/app/layout.tsx): corre antes de pintar. Un solo script: cada uno
 * en <head> bloquea el pintado. Hoy la CSP lo permite con 'unsafe-inline'; si BD-142 pasa a nonce o
 * hashes, este texto es constante: se agrega su sha256 a script-src.
 *
 * 1. Clase `js` en <html> (BD-025): lo que se oculta o anima solo con JS depende de ella; sin JS
 *    todo queda visible.
 * 2. Splash (BD-043, docs/09 §3, A-01). Se muestra solo si se cumple todo:
 *    - `data-splash-enabled="true"` en <html> (ajuste `splash_enabled`);
 *    - el visitante aterriza en `/` sin ancla (quien llega a una ficha o a una sección busca algo);
 *    - es la primera vez en la sesión (`sessionStorage`, SPLASH_KEY);
 *    - no es un bot ni un previsualizador de enlaces.
 *    Con la página prerenderizada por el navegador, espera a que se active.
 *    Pone `data-splash="on"` («reduced» con movimiento reducido: sin animación, 500 ms) y el CSS
 *    (motion.css) hace el resto. Termina con el `animationend` del overlay (respaldo: temporizador).
 *    Un toque, clic, tecla, la rueda o un scroll lo saltan: «out» (fundido corto, sin capturar
 *    clics) y luego se quita. No bloquea el scroll. Si algo falla (storage bloqueado), no hay splash.
 * Se escribe a mano y no con Function.toString(): el compilador o la cobertura meterían código ajeno.
 */

/**
 * Bots, rastreadores e IA (Googlebot/, AdsBot-, …crawler, …spider) y previsualizadores de enlaces.
 * «bot» solo seguido de / ; - o como palabra suelta: teléfonos como CUBOT sí ven el splash.
 */
const BOTS =
  "bot[\\/;-]|\\bbot\\b|crawl|spider|slurp|preview|inspectiontool|facebookexternalhit|whatsapp|telegram|discord|slack|embedly|skype";

/** Lo que salta el splash: no bloquea nada, quien quiere usar la página la usa. */
const SKIP_EVENTS = ["keydown", "pointerdown", "wheel", "scroll"];

export const HEAD_SCRIPT = `(function(d){d.classList.add("js");try{
if(d.getAttribute("data-splash-enabled")!=="true"||location.pathname!=="/"||location.hash||/${BOTS}/i.test(navigator.userAgent)||sessionStorage.getItem("${SPLASH_KEY}"))return;
var go=function(){
sessionStorage.setItem("${SPLASH_KEY}","1");
var r=matchMedia("(prefers-reduced-motion: reduce)").matches,t,ev=${JSON.stringify(SKIP_EVENTS)},
o={capture:true,passive:true},
each=function(f){for(var i=0;i<ev.length;i++)f(ev[i],skip,o)},
end=function(){clearTimeout(t);d.removeAttribute("data-splash");each(removeEventListener);d.removeEventListener("animationend",done,true)},
done=function(e){if(e.target.classList&&e.target.classList.contains("splash"))end()},
skip=function(){each(removeEventListener);clearTimeout(t);d.setAttribute("data-splash","out");t=setTimeout(end,${SPLASH_MS.out + SPLASH_MS.margin})};
d.setAttribute("data-splash",r?"reduced":"on");
each(addEventListener);d.addEventListener("animationend",done,true);
t=setTimeout(end,r?${SPLASH_MS.reduced}:${SPLASH_MS.on + SPLASH_MS.margin})};
document.prerendering?document.addEventListener("prerenderingchange",go,{once:true}):go()
}catch(e){}})(document.documentElement)`.replace(/\n/g, "");
