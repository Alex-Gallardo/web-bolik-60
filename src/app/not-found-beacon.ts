/**
 * Script en línea de la página 404 (BD-046): avisa a /api/not-found qué ruta no existe y desde
 * dónde llegó el visitante. La 404 es estática; leer la petición en el servidor volvería dinámicas
 * todas las rutas (el 404 forma parte del árbol de cada una). sendBeacon no bloquea ni espera
 * respuesta. Sin JavaScript no se cuenta (los rastreadores sin JS, en general, son ruido).
 * Si la CSP deja de permitir scripts en línea, su hash va junto al de HEAD_SCRIPT (BD-142).
 */
export const NOT_FOUND_BEACON =
  'try{navigator.sendBeacon("/api/not-found",JSON.stringify({p:location.pathname+location.search,r:document.referrer}))}catch(e){}';
