/**
 * Mapa de redirecciones 301 del sitio Joomla (bolik66.com) al nuevo sitio.
 * Fuente: rastreo del sitio actual (ticket BD-094). Completar con el rastreo real
 * (Screaming Frog o script) y con las URLs con tráfico de Search Console.
 * Todas las claves en minúsculas.
 */

export const LEGACY_PATHS: Record<string, string> = {
  "/index.php": "/",
  "/index.php/productos": "/productos",
  "/index.php/distribuidores": "/donde-comprar",
  "/index.php/contactenos": "/contacto",
  "/index.php/3-vision-y-mision": "/nuestra-historia",
  "/index.php/productos/2-uncategorised/3-vision-y-mision": "/nuestra-historia",
  "/index.php/descargar-catalogo-com": "/productos",
  "/index.php/productos-nuevos/productos-nuevos": "/productos",
  "/index.php/catalogo-2": "/escuelas",
  // Categorías
  "/index.php/boligrafos": "/productos/boligrafos",
  "/index.php/lapices": "/productos/lapices-y-lapices-de-colores",
  "/index.php/lapices-de-colores": "/productos/lapices-y-lapices-de-colores",
  "/index.php/crayones": "/productos/crayones-de-cera",
  "/index.php/reglas": "/productos/tijeras-reglas-y-geometria",
  "/index.php/cepillos-dentales": "/productos", // URL heredada de "Estuche Escolar"; apuntar a su categoría cuando exista
  "/index.php/marcadores-permanentes": "/productos/marcadores",
  "/index.php/marcadores-de-pizarra": "/productos/marcadores",
  "/index.php/marcadores-fluorescentes": "/productos/marcadores",
  "/index.php/marcadores-recargables": "/productos/marcadores",
  "/index.php/tintas-para-recargar": "/productos/marcadores",
  "/index.php/marcadores-escolares": "/productos/marcadores",
  "/index.php/marcadores-metalizados": "/productos/marcadores",
  "/index.php/goma-blanca": "/productos/pegamentos-y-silicon",
  "/index.php/silicon": "/productos/pegamentos-y-silicon",
  "/index.php/goma-en-barra": "/productos/pegamentos-y-silicon",
  "/index.php/borradores": "/productos/borradores-y-sacapuntas",
  "/index.php/sacapuntas": "/productos/borradores-y-sacapuntas",
  "/index.php/tijera-escolar": "/productos/tijeras-reglas-y-geometria",
  "/index.php/tabla-para-escritura": "/productos/tijeras-reglas-y-geometria",
  "/index.php/articulos-publicitarios": "/empresas",
  "/index.php/fabik-productos": "/productos/marcadores",
  // VirtueMart con alias
  "/component/virtuemart/trio-ultra": "/productos/boligrafos/bolik-ultra",
  "/component/virtuemart/trio-ultrafino": "/productos/boligrafos", // cambiar a la ficha de Bolik Ultra Fino cuando se publique
  "/component/virtuemart/jumbo-celeste": "/productos/crayones-de-cera",
  "/component/virtuemart/fabik-permanente-47": "/productos/marcadores",
  "/component/virtuemart/fabik-pizarra": "/productos/marcadores",
  "/component/virtuemart/portalápiz-bolik": "/productos", // el proxy decodifica %C3%A1 antes de buscar
};

/** virtuemart_product_id → nueva URL (completar con el rastreo) */
export const LEGACY_VM_PRODUCTS: Record<string, string> = {
  "17": "/productos/boligrafos/bolik-ultra",
  "18": "/productos/boligrafos", // Bolik Ultra Fino: cambiar a su ficha cuando se publique
  "24": "/productos/lapices-y-lapices-de-colores",
  "41": "/productos/marcadores",
  "42": "/productos",
  "51": "/productos/marcadores",
  "54": "/productos/tijeras-reglas-y-geometria",
  "62": "/productos/borradores-y-sacapuntas",
  "63": "/productos/tijeras-reglas-y-geometria",
  "64": "/productos/tijeras-reglas-y-geometria",
};

/** virtuemart_category_id → nueva URL */
export const LEGACY_VM_CATEGORIES: Record<string, string> = {
  "2": "/productos/boligrafos",
  "6": "/productos/marcadores",
  "9": "/productos/lapices-y-lapices-de-colores",
  "12": "/productos/tijeras-reglas-y-geometria",
  "13": "/productos/marcadores",
  "17": "/productos/pegamentos-y-silicon",
  "18": "/productos/pegamentos-y-silicon",
  "20": "/productos/borradores-y-sacapuntas",
  "21": "/productos/borradores-y-sacapuntas",
  "22": "/productos/tijeras-reglas-y-geometria",
  "30": "/productos",
  "32": "/productos/tijeras-reglas-y-geometria",
};
