# 16 · Estrategias de implementación y lanzamiento

Cómo construir el MVP con poco riesgo y cómo pasar del sitio Joomla actual al nuevo **sin perder posicionamiento ni cotizaciones**. Solo cubre el lado técnico; los anuncios y la comunicación del lanzamiento los maneja otra área.

## 1. Estrategias de implementación del MVP

| # | Estrategia | Qué significa en la práctica | Por qué |
|---|---|---|---|
| 1 | **Staging desde la semana 1** | BD-016 en S0. Todo lo terminado se ve en staging cada viernes. | Los problemas de IIS, permisos o rendimiento real aparecen en noviembre, no el 10 de enero. |
| 2 | **Rebanadas verticales** | Terminar una página de punta a punta (datos → UI → SEO → pruebas) antes de empezar la siguiente. El 4 de diciembre debe existir el flujo completo home → ficha → cotización enviada. | Siempre hay algo que funciona y se puede mostrar; el riesgo se descubre temprano. |
| 3 | **Sistema de diseño primero** | `/styleguide` (S1) antes de las páginas. Las páginas solo combinan componentes existentes. | Velocidad en S2–S3 y consistencia visual sin depender de revisiones. |
| 4 | **Datos reales desde el seed** | El seed usa el Bolik Ultra real, tiendas reales y FAQs reales; lo provisional se marca `isVerified = false`. | Las pruebas de SEO y rendimiento son honestas; no queda "lorem" escondido. |
| 5 | **Contratos con *mock*** | El ERP empieza en `noop` y los correos en `SMTP_MODE=file`. La integración real se activa con una variable. | El sitio no espera a SMART-K66 ni a TI para avanzar. |
| 6 | **Presupuestos que bloquean** | Lighthouse CI y el bundle budget fallan el PR. | El rendimiento es la prioridad #1; arreglarlo al final cuesta el triple. |
| 7 | **Mejora progresiva** | El HTML del servidor tiene todo el contenido; JS agrega interacción (filtros, drawer, mapa, video). | SEO, IA y teléfonos lentos funcionan siempre. |
| 8 | **Interruptores en `SiteSetting`** | `splash_enabled`, `kits_enabled`, `show_kit_prices`, `erp_enabled`, `whatsapp_number`. | Apagar algo problemático sin desplegar. |
| 9 | **Must primero, Could al final** | Cada sprint cierra sus Must antes de tocar un Should. | Si el tiempo se acaba, lo que falta es lo prescindible. |
| 10 | **Congelamientos** | Funcionalidades: 18 dic. Código: 6 ene. Después solo correcciones. | Las semanas de fin de año son cortas; el lanzamiento necesita estabilidad. |

## 2. Estrategia de corte

- **Mismo dominio** (`www.bolik66.com`), **corte único** el **lunes 11 de enero de 2027 a las 6:00** (bajo tráfico, equipo completo disponible toda la semana).
- Las URL viejas responden **301** a su equivalente (doc 10 §6). Nada queda en 404.
- El sitio Joomla **no se apaga**: queda accesible solo desde la red interna (`old.bolik66.com` o por IP, con `noindex`) durante 30 días como referencia y plan de reversión.
- Los formularios del sitio viejo dejan de recibir datos al momento del corte.

Dos variantes según dónde vive hoy el sitio Joomla (confirmar con TI en S0):

| Variante | Corte | Reversión |
|---|---|---|
| **A. Joomla en el mismo IIS** | Mover los enlaces (bindings) `www.bolik66.com` y `bolik66.com` del sitio Joomla al sitio `bolik66` nuevo. Efecto inmediato. | Devolver los enlaces (1 min). |
| **B. Joomla en otro hosting** | Cambiar el registro DNS `A` de `www` y la raíz a la IP pública del IIS. **Bajar el TTL a 300 s una semana antes** (4 ene). | Volver a poner la IP anterior (efecto en ~5 min gracias al TTL bajo). |

## 3. Cuenta regresiva

| Cuándo | Qué | Ticket |
|---|---|---|
| T-30 (11 dic) | Exportación de URLs con tráfico y enlaces externos desde Search Console; mapa de redirecciones completo | BD-094 |
| T-21 (18 dic) | Funcionalidades completas; producción instalada (servidor, IIS, servicio, BD) | BD-140, BD-141 |
| T-14 (28 dic) | Contenido final importado en staging; QA en dispositivos en curso | BD-150, BD-135 |
| T-7 (4 ene) | TTL del DNS a 300 s (variante B); certificado instalado en producción; respaldos y monitoreo activos | BD-143, BD-144 |
| T-5 (6 ene) | **Código congelado**. Ensayo general del corte en staging, cronometrado | BD-151 |
| T-3 (8 ene) | Despliegue de la versión candidata a producción (accesible solo por IP interna / archivo `hosts`); importación final de contenido en la BD de producción | BD-152 |
| T-1 (vie 8 ene, tarde) | Reunión **go / no-go** (§4). Respaldo completo de la BD de producción | — |
| T-0 (lun 11 ene, 6:00) | Runbook (§5) | BD-152 |
| T+1 a T+14 | Hipercuidado (§7) | BD-153 |

## 4. Criterios go / no-go

Se lanza **solo si todo esto es verdadero** el viernes 8 de enero:

- [ ] CI en verde sobre el tag de la versión candidata (unitarias, integración, E2E `@critico`, axe, Lighthouse).
- [ ] Lighthouse móvil en **producción** (por IP interna): home ≥ 90 rendimiento, resto ≥ 95, SEO 100 en todas.
- [ ] `pnpm check:redirects` contra producción: 100 % de las URL del mapa → 301 → 200.
- [ ] Cotización real de prueba enviada en producción: llega el correo a Ventas, el acuse al cliente y (si aplica) el prospecto a SAP. Luego se borra.
- [ ] Formularios de escuelas, distribuidor y contacto probados en producción.
- [ ] Admin: usuarios reales creados, contraseñas entregadas, roles correctos.
- [ ] Respaldos ejecutados y restauración probada (BD-143).
- [ ] Monitoreo con alertas funcionando (prueba apagando el servicio en staging).
- [ ] `rollback.ps1` probado en staging.
- [ ] 0 errores bloqueantes abiertos de QA (BD-135).
- [ ] Sin texto provisional en producción (búsqueda de "lorem", "ejemplo", "XXXX", "TODO").

Si algo falla: **no-go**, se corrige y se reprograma (el siguiente lunes). No se lanza "a medias".

## 5. Runbook del corte (lunes 11 de enero)

Responsables: desarrollador(es), TI (DNS/IIS), una persona de Ventas para la prueba de cotización.

| Hora | Paso | Verificación |
|---|---|---|
| 5:45 | Confirmar que producción responde por IP interna con la versión candidata (`/api/health` → `version`) | 200 y commit correcto |
| 5:50 | Respaldo rápido de la BD de producción | Archivo `.bak` creado |
| 6:00 | **Variante A:** mover los enlaces de IIS. **Variante B:** cambiar el DNS | — |
| 6:05 | Desde datos móviles (fuera de la red): abrir `https://www.bolik66.com` | Se ve el sitio nuevo, candado válido |
| 6:10 | `http://bolik66.com` → `https://www.bolik66.com` | 301 en una sola redirección |
| 6:15 | `pnpm check:redirects --base https://www.bolik66.com` | 100 % OK |
| 6:20 | Recorrido rápido: home, catálogo, ficha del Ultra, buscar "pt00058", dónde comprar, escuelas | Sin errores de consola |
| 6:30 | Cotización de prueba de punta a punta | Correo recibido por Ventas; folio visible en el admin |
| 6:40 | `sitemap.xml`, `robots.txt` (sin `Disallow: /` global), `llms.txt` | 200 y contenido correcto |
| 6:45 | Search Console y Bing: enviar sitemap; inspeccionar home y ficha del Ultra | BD-096 |
| 6:50 | Activar tareas programadas de producción (IndexNow, retry ERP, sync) | Primera ejecución OK |
| 7:00 | GA4 en tiempo real recibe visitas; Clarity graba sesiones | Eventos visibles |
| 7:15 | Anunciar internamente que el corte terminó (al canal de TI/Gerencia acordado) | — |

**Si algo crítico falla antes de las 7:30** y no se corrige en 15 minutos: revertir (variante A/B) y analizar con calma.

## 6. Checklist post-lanzamiento (día 1)

- [ ] Monitor de disponibilidad en verde desde las 6:00.
- [ ] Logs sin errores nuevos (`"level":50`).
- [ ] `NotFoundLog`: revisar cada 2 horas; crear redirecciones para lo que tenga tráfico.
- [ ] Cotizaciones reales llegando (comparar con el promedio del sitio viejo).
- [ ] Search Console: sin errores de cobertura nuevos; el sitemap procesado.
- [ ] Velocidad real (GA4 `web_vital`) en rango.

## 7. Hipercuidado (11–22 de enero)

| Frecuencia | Revisión | Acción |
|---|---|---|
| 2 veces al día | Logs, `NotFoundLog`, cotizaciones con `erpStatus = error`, alertas | Corregir el mismo día |
| Diario | Search Console (cobertura, páginas indexadas), Web Vitals, eventos de conversión en GA4 | Ticket si algo empeora |
| Diario | Grabaciones de Clarity filtradas por "rage clicks" y errores de JS | Ticket de UX si se repite |
| Semanal | Reporte corto: disponibilidad, errores, 404 resueltos, cotizaciones, velocidad | Para Gerencia y TI |

Reglas durante el hipercuidado:
- Solo correcciones; nada nuevo (salvo los Should/Could pendientes ya planificados).
- Cada corrección pasa por CI y staging, aunque sea de una línea.
- Errores críticos (formularios, home, ficha) se corrigen en < 24 h; los demás entran al backlog.

## 8. Después del hipercuidado

- Retrospectiva técnica y backlog de Fase 2 (BD-154).
- A las 4 semanas: comparar indexación y clics orgánicos contra el sitio viejo; revisar que las URL viejas ya no aparezcan en Google.
- A los 30 días: apagar el sitio Joomla (con respaldo completo archivado).
- A los 3 meses: revisar las metas de KPIs del doc 12 con datos reales.
