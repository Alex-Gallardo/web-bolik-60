# Bolik Digital — Guía de desarrollo del MVP

Guía completa para construir desde cero el nuevo sitio de **Bolik** (bolik66.com): sitio público con catálogo, fichas de producto, cotizaciones para mayoreo, localizador de tiendas, sección para escuelas, panel administrativo, `/styleguide`, SEO técnico y optimización para buscadores con IA.

Está escrita para un **desarrollador junior que trabaja con Claude Code**. Cada documento explica el *qué*, el *por qué* y el *cómo*, y el plan de acción está dividido en tickets con criterios de aceptación.

> **Proyecto:** Bolik Digital · **Marca pública:** Bolik · **Dominio:** www.bolik66.com
> **Objetivo:** lanzar el MVP el **lunes 11 de enero de 2027**, antes del ciclo escolar.
> **Prioridades, en este orden:** 1) SEO y carga rápida · 2) animaciones suaves · 3) colores vivos e interfaz amigable · 4) mobile first.

---

## Cómo usar este paquete

1. Copia `CLAUDE.md` a la **raíz del repositorio**. Claude Code lo lee en cada sesión: ahí están el stack, las convenciones y las reglas que no se negocian (rendimiento, SEO, accesibilidad, animación).
2. Copia la carpeta `docs/` al repositorio (`/docs`). Son la fuente de verdad del proyecto.
3. Copia `starter/` como referencia. Son archivos base (esquema de BD, tokens CSS, splash, hero, SEO, redirecciones, sesión del admin, cotización, `next.config.ts`, `.env.example`, Lighthouse CI) que Claude Code adapta en los tickets. Copia también `starter/.claude/` a la raíz del repo: permisos, hook de formato, el comando `/ticket`, `/perf-check` y el subagente `revisor`.
4. Importa `tickets.csv` en tu gestor de tareas (GitHub Projects, Jira, Trello, Azure Boards).
5. Trabaja **un ticket a la vez** siguiendo `docs/18-playbook-claude-code.md`.

## Contenido del paquete

```text
bolik-digital-guia/
├─ README.md               este archivo
├─ CLAUDE.md               reglas del repo para Claude Code (va en la raíz del repo)
├─ tickets.csv             117 tickets para importar al tablero
├─ docs/                   01–18 (ver tabla)
└─ starter/                archivos base para copiar y adaptar
   ├─ .claude/             settings.json, skills (ticket, perf-check), agents (revisor)
   ├─ .env.example · next.config.ts
   ├─ prisma/schema.prisma
   ├─ scripts/             hooks/format.mjs, check-colors.mjs
   ├─ tests/lighthouserc.json
   └─ src/                 env, proxy, styles, splash, hero, motion, feedback,
                           seo (metadata, jsonld, redirecciones, IndexNow, llms.txt, sitemap, robots),
                           lib (constants, cache-tags, image-loader), quote/store,
                           server (folio, auth con iron-session)
```

## Orden de lectura

| # | Documento | Para qué sirve |
|---|---|---|
| — | [CLAUDE.md](../CLAUDE.md) | Reglas del repo para Claude Code (leer primero) |
| 01 | [Alcance y decisiones](01-alcance-y-decisiones.md) | Qué entra al MVP, supuestos, decisiones técnicas (ADR) |
| 02 | [Branding](02-branding.md) | Nombre, identidad, colores, tipografía, voz de la interfaz |
| 03 | [Arquitectura](03-arquitectura.md) | Mapas del sistema, renderizado, integración SAP, seguridad |
| 04 | [Estructura del proyecto](04-estructura-proyecto.md) | Carpetas y archivos, módulos, convenciones |
| 05 | [Base de datos](05-base-de-datos.md) | ERD, tablas, relaciones, índices, seeds |
| 06 | [Vistas](06-vistas.md) | Mapa del sitio y estructura de cada vista pública y del admin |
| 07 | [Flujos de usuario](07-flujos-de-usuario.md) | Flujos por público y flujos de eficiencia |
| 08 | [Styleguide](08-styleguide.md) | Tokens, componentes, fondos, alertas amigables, vista `/styleguide` |
| 09 | [Animaciones](09-animaciones.md) | Sistema de movimiento, splash de 2 s, transiciones |
| 10 | [SEO](10-seo.md) | SEO técnico, datos estructurados, redirecciones de Joomla |
| 11 | [IA y buscadores generativos](11-ia-y-buscadores-generativos.md) | `llms.txt`, bots de IA, datos clave, automatización |
| 12 | [Performance y KPIs](12-performance-y-kpis.md) | Presupuestos, checklist, eventos de analítica, KPIs |
| 13 | [Pruebas y calidad](13-pruebas-y-calidad.md) | Unitarias, E2E, accesibilidad, Lighthouse CI, QA |
| 14 | [Plan de acción](14-plan-de-accion.md) | Épicas, tickets, sprints hasta el lanzamiento |
| 15 | [Despliegue y operación](15-despliegue-y-operacion.md) | IIS + Node, CI/CD, respaldos, monitoreo |
| 16 | [Estrategia de lanzamiento](16-estrategia-de-lanzamiento.md) | Cambio del sitio Joomla al nuevo, hipercuidado |
| 17 | [Copys](17-copys.md) | Textos del sitio, microcopy, SEO y redes sociales |
| 18 | [Playbook de Claude Code](18-playbook-claude-code.md) | Cómo trabajar cada ticket con Claude Code |

## Resumen de decisiones

| Tema | Decisión |
|---|---|
| Framework | **Next.js 16 (App Router) + React 19 + TypeScript**; páginas públicas prerenderizadas con **Cache Components** e invalidación por tags |
| Estilos | **Tailwind CSS v4** con tokens propios en CSS; componentes con **Radix UI** (vía shadcn/ui) |
| Animación | **CSS primero**; librería **Motion** solo para drawer, modales y listas, cargada de forma diferida |
| Base de datos | **SQL Server** (nueva BD `BolikDigital`) con **Prisma** |
| ERP | **SAP B1** a través de **SMART-K66** (la web nunca toca SAP directamente) |
| Hosting | **IIS interno** como proxy inverso (ARR) hacia **Node.js** ejecutando Next en modo `standalone` |
| Admin | Panel propio en `/admin` con sesión cifrada **iron-session** + **bcryptjs** (usuario y contraseña, roles) |
| Medios | Imágenes procesadas al subir (sharp → WebP en 6 anchos + blur); videos MP4 H.264 + póster |
| Analítica | GA4 + Microsoft Clarity + registro propio de clics salientes |
| Pruebas | Vitest, Playwright, axe, Lighthouse CI |

## Supuestos (confírmalos antes del ticket BD-001)

1. El sitio se publica en el **IIS interno** con un servidor Windows que puede ejecutar Node.js LTS como servicio.
2. Hay una instancia de **SQL Server** disponible para crear la base `BolikDigital` (separada de las bases de SAP y SMART-K66).
3. **SMART-K66 expondrá dos endpoints**: lectura de artículos (código, nombre, código de barras, empaques, activo) y creación de prospecto/oportunidad. Mientras no existan, el adaptador funciona en modo "solo base de datos + correo".
4. Hay un buzón **SMTP (Office 365 / Exchange)** para enviar notificaciones de cotizaciones.
5. El dominio **www.bolik66.com** se conserva para no perder posicionamiento.
6. El MVP **no muestra precios** de productos individuales; los kits escolares sí pueden mostrar precio sugerido si Gerencia lo aprueba (campo configurable).
7. El portal B2B con usuario por cliente es **Fase 2**; la base de datos ya queda preparada.
8. El plan de acción suma ~87 días-persona: para lanzar el 11 de enero se necesitan **2 desarrolladores** (o un alcance reducido y otra fecha; ver doc 14 §2 y §7).

## Preguntas abiertas (no bloquean el inicio)

- ¿Los usuarios del admin usarán cuentas de Microsoft 365? Si sí, se agrega inicio de sesión con Entra ID en Fase 2.
- ¿Cuál es el número oficial de WhatsApp de ventas?
- ¿Razón social oficial para el pie de página: "Industrias Bolik, S.A." (según fichas técnicas) o la de Grupo K-66?
- ¿Se mostrará precio sugerido en kits escolares?

---

*Las cifras de ejemplo (puntos de venta, colaboradores, hitos intermedios, precios de kits) son ilustrativas hasta que se validen. En la base de datos van en tablas editables desde el admin, nunca escritas en el código.*
