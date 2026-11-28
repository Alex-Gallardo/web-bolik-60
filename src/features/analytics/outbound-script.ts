import { BEACON_PATH, OUTBOUND_EVENTS } from "./outbound";

/**
 * Script en línea del layout del sitio (BD-083): escucha los clics de toda la página (también el
 * clic medio y Enter, que dispara click) y, si es un enlace `a[data-event]` de un clic saliente
 * (OUTBOUND_EVENTS) que sale del sitio, manda a /api/beacon el evento, los data-* del enlace y la
 * ruta sin query, con navigator.sendBeacon (no frena la navegación). Va en línea y no en una isla:
 * no suma JS a ninguna página (docs/12 §2; la home está cerca de su tope). Corre una sola vez:
 * en una navegación del sitio el layout no se vuelve a pintar.
 *
 * Escrito a mano como texto (como head-script.ts y los scripts previos al pintado), con sus pruebas
 * en jsdom. Nunca manda datos personales: solo lo que el enlace trae marcado (y el servidor guarda
 * la ruta sin folios ni búsquedas).
 *
 * Límites conocidos: React no ejecuta un <script> que crea en el navegador, así que si se llega al
 * sitio desde el admin con un <Link> (mismo layout raíz), corre al recargar. Un <a> de SVG
 * (a.href no es texto) no cuenta: el sitio no tiene. El aviso sale aunque otro manejador cancele
 * la navegación: ningún enlace marcado lo hace.
 */
export const OUTBOUND_SCRIPT = buildOutboundScript();

function buildOutboundScript(): string {
  const events = JSON.stringify(
    Object.fromEntries(Object.keys(OUTBOUND_EVENTS).map((e) => [e, 1])),
  );
  const fields = JSON.stringify({
    r: "retailer",
    s: "store",
    d: "department",
    k: "sku",
    c: "context",
  });
  return `(function(){if(window.__bolikBeacon)return;window.__bolikBeacon=1;var E=${events},F=${fields};function send(ev){if(ev.type==="auxclick"&&ev.button!==1)return;var t=ev.target;if(t&&t.nodeType===3)t=t.parentNode;var a=t&&t.closest?t.closest("a[data-event]"):null;if(!a)return;var e=a.getAttribute("data-event");if(!E[e])return;var u;try{u=new URL(a.href,location.href)}catch(x){return}if(u.origin===location.origin)return;var b={e:e,p:location.pathname};for(var k in F){var v=a.dataset[F[k]];if(v)b[k]=v}var body=JSON.stringify(b);try{if(navigator.sendBeacon&&navigator.sendBeacon(${JSON.stringify(BEACON_PATH)},new Blob([body],{type:"application/json"})))return;fetch(${JSON.stringify(BEACON_PATH)},{method:"POST",body:body,headers:{"Content-Type":"application/json"},keepalive:true}).catch(function(){})}catch(x){}}document.addEventListener("click",send,true);document.addEventListener("auxclick",send,true)})();`;
}
