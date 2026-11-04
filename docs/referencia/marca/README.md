# Logo de Bolik

`bolik-logo-original.svg` es el archivo oficial que entregó Mercadeo (Illustrator, 92 KB). El sitio no lo usa directo: usa versiones optimizadas.

| Archivo del sitio | Contenido | Peso |
|---|---|---|
| `public/brand/bolik-logo.svg` | Logo completo: BOLIK®, «Expresa tu talento.» y el trazo de crayón | 23 KB (7 KB gzip) |
| `public/brand/bolik-logo-white.svg` | El mismo con letras y lema en blanco (fondos navy y azul) | 23 KB (7 KB gzip) |
| `src/components/brand/logo.tsx` (variante `wordmark`) | Solo BOLIK®, en línea con `currentColor` | 1.2 KB |

## Cómo se generaron

1. SVGO con precisión 1 (sin diferencia visible frente al original):
   `npx svgo@4.1.0 --precision 1 -i bolik-logo-original.svg -o optimizado.svg`
2. Del resultado se toman tres trazos: el crayón (con su degradado), BOLIK® y el lema. El lema venía repetido dos veces (relleno y contorno de 0.83): queda un solo trazo con relleno y contorno.
3. El `viewBox` se recorta al contenido con 1 unidad de margen: `28.5 42.5 419 191.5` (completo) y `39.5 42.5 398.5 98.5` (wordmark).
4. Versión blanca: el relleno y el contorno de BOLIK® y del lema pasan a `#fff`; el crayón no cambia.

Si Mercadeo actualiza el logo, reemplaza el original y repite estos pasos.

## Pendiente con Mercadeo

- El logo no tiene isotipo: para el favicon y los íconos de app (BD-040) falta un ícono oficial; mientras tanto se propone la «B» del propio logo.
- El lema del logo es «Expresa tu talento.»; doc 02 usa «De la materia prima a tu primer trazo.» como línea de marca del sitio. Confirmar que conviven.
- En el negativo sobre `--blue`, el extremo celeste del crayón casi se pierde contra el azul del sitio: confirmar si se acepta o si sobre azul se usa otra versión.
