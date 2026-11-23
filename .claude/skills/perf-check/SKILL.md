---
name: perf-check
description: Verifica rendimiento y SEO de Bolik Digital (build, tamaño de JS por ruta y Lighthouse) contra los presupuestos de docs/12. Úsalo después de tocar una página pública.
---

# Chequeo de rendimiento

1. Corre `pnpm build` y extrae del resumen el JS inicial por ruta.
2. Compara con los presupuestos de `docs/12-performance-y-kpis.md` §2 (home ≤ 160 KB, resto y ficha ≤ 165 KB, `/cotizacion` ≤ 178 KB transferidos; Next 16 + React 19 ocupan ~140 KB y el layout ~10 KB).
3. Corre `pnpm lhci` y resume por URL: Rendimiento, Accesibilidad, Buenas prácticas, SEO, LCP, CLS, TBT.
4. Si algo no cumple: usa `pnpm analyze` para encontrar el módulo responsable y propone correcciones ordenadas por impacto (carga diferida, mover a servidor, `sizes`/`priority` en imágenes, quitar dependencias).
5. Entrega una tabla: ruta · métrica · valor · meta · estado.
