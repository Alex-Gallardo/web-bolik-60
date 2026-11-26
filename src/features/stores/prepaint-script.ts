/** Id de la lista de /donde-comprar: lo usan la página, la isla de filtros y este script. */
export const STORES_LIST_ID = "tiendas-lista";

/**
 * Script en línea que va justo después de la lista de /donde-comprar (BD-080), como el del
 * catálogo: con #departamento en la URL (adonde lleva el formulario de la home) oculta los demás
 * grupos antes del primer pintado, así la página no se mueve al hidratar (CLS). Solo acepta
 * departamentos con grupo en la página (`allowed`), como departmentFromHash. Si algo falla, se ve
 * todo. Escrito a mano, sin Function.toString().
 */
export function storesPrepaintScript(allowed: readonly string[]): string {
  return `(function(){try{
var a=${JSON.stringify(allowed)},h=decodeURIComponent(location.hash.slice(1));
if(a.indexOf(h)<0)return;
var l=document.getElementById(${JSON.stringify(STORES_LIST_ID)});if(!l)return;
var g=l.querySelectorAll("[data-store-group]");
for(var i=0;i<g.length;i++)g[i].hidden=g[i].getAttribute("data-store-group")!==h;
}catch(x){}})()`;
}
