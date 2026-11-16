/**
 * Color de la ficha sin JS y sin saltos (BD-062). Los radios de color (isla de compra) deciden con
 * CSS qué conjunto de fotos y qué código se ven ([data-color-variant], motion.css los oculta a todos):
 * - variantStyles: una regla por color, en un <style> de la página. Las claves de color son
 *   [a-z0-9_-] (esquema del seed y del admin), pero se filtran aquí también: nada raro entra al CSS.
 * - colorPrepaintScript: con ?color=rojo (QR del empaque, enlace compartido) marca ese radio
 *   mientras el navegador lee el HTML, antes del primer pintado: la página nunca muestra el azul
 *   para cambiar después, y le da prioridad a la primera foto de ese color (es la LCP). Un color que
 *   no existe se ignora. Escrito a mano, como el de los filtros.
 */

const SAFE_KEY = /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/;

export function variantStyles(fichaId: string, colorKeys: readonly string[]): string {
  return colorKeys
    .filter((key) => SAFE_KEY.test(key))
    .map(
      (key) =>
        `#${fichaId}:has(input[name="color"][value="${key}"]:checked) [data-color-variant="${key}"]{display:block}`,
    )
    .join("");
}

export function colorPrepaintScript(fichaId: string, colorKeys: readonly string[]): string {
  const keys = colorKeys.filter((key) => SAFE_KEY.test(key));
  return `(function(){try{
var c=new URLSearchParams(location.search).get("color"),k=${JSON.stringify(keys)};
if(!c||k.indexOf(c)<0)return;
var r=document.getElementById(${JSON.stringify(fichaId)});if(!r)return;
var i=r.querySelectorAll('input[name="color"]');
for(var j=0;j<i.length;j++){if(i[j].value===c){i[j].checked=true;break}}
var g=r.querySelector('[data-color-variant="'+c+'"] img');if(g){g.loading="eager";g.fetchPriority="high"}
}catch(x){}})()`;
}
