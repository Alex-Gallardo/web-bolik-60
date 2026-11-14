import { FILTER_KEYS, type FilterKey } from "./filters";

/** Id de la grilla del catálogo: lo usan la página, la isla de filtros y este script. */
export const CATALOG_GRID_ID = "catalogo-grilla";

/**
 * Script en línea que va justo después de la grilla de /productos (BD-060). Corre mientras el
 * navegador lee el HTML, antes del primer pintado: con un enlace filtrado (?linea=arte, desde la
 * home o compartido) oculta lo que no corresponde, así la página no se mueve al hidratar (CLS).
 * Hace lo mismo que matchesFilters con los data-* de cada <li>; luego la isla toma el control.
 * Solo acepta valores que existen (`allowed`), como parseFilters. Si algo falla, se ve todo.
 * Escrito a mano (no Function.toString()), como head-script.ts.
 */
export function catalogPrepaintScript(allowed: Record<FilterKey, readonly string[]>): string {
  return `(function(){try{
var a=${JSON.stringify(allowed)},k=${JSON.stringify(FILTER_KEYS)},p=new URLSearchParams(location.search),f={},n=0;
for(var i=0;i<k.length;i++){var v=p.get(k[i]);if(v&&a[k[i]].indexOf(v)>-1){f[k[i]]=v;n++}}
if(!n)return;
var g=document.getElementById(${JSON.stringify(CATALOG_GRID_ID)});if(!g)return;
var has=function(l,v){return (" "+(l||"")+" ").indexOf(" "+v+" ")>-1},ls=g.querySelectorAll("[data-product]");
for(var j=0;j<ls.length;j++){var e=ls[j],d=e.dataset;
e.hidden=!((!f.linea||d.linea===f.linea)&&(!f.uso||has(d.usos,f.uso))&&(!f.color||has(d.colores,f.color)))}
}catch(x){}})()`;
}
