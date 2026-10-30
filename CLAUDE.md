# CLAUDE.md — Bolik Digital

Este archivo guía a Claude Code en este repositorio. Léelo completo antes de cualquier tarea.

## Qué es este proyecto

Sitio público y panel administrativo de **Bolik**, fabricante guatemalteco de útiles de escritura desde 1966 (Grupo K-66). Dominio: `www.bolik66.com`. Idioma: **español de Guatemala** (`es-GT`), trato de **tú**.

Públicos: padres de familia, docentes y colegios, librerías, distribuidores, empresas y universidades.
Objetivos del MVP: posicionar en Google y en buscadores con IA, llevar al visitante a un punto de venta o a una cotización de mayoreo, y captar solicitudes (cotizaciones, visitas escolares, distribuidores) que lleguen a Ventas y a SAP.

La documentación completa está en `/docs`. Si una instrucción de este archivo choca con un doc, gana este archivo; si choca con lo que pide el usuario en la sesión, gana el usuario.

## Stack

- **Next.js 16** (App Router, `cacheComponents: true`, `output: "standalone"`) + **React 19** + **TypeScript** estricto. En Next 16 el middleware se llama `proxy.ts`; la caché se declara con `'use cache'` + `cacheLife` + `cacheTag`. Verifica en la documentación oficial cualquier API que recuerdes de versiones anteriores; la de la versión instalada está en `node_modules/next/dist/docs/` (ver `AGENTS.md`, que `next dev` regenera).
- **Tailwind CSS v4** con tokens en `src/styles/tokens.css` (nunca colores sueltos en componentes). La paleta por defecto de Tailwind está desactivada: solo existen los colores de marca (`bg-blue`, `text-ink`…); `pnpm check:colors` vigila hex sueltos y variables autorreferentes.
- **Radix UI** (vía shadcn/ui, código copiado en `src/components/ui`) para diálogos, tabs, acordeones, popovers.
- **Motion** (`motion/react`) solo con `LazyMotion` + `m`, y solo donde CSS no alcanza (drawer, modales, listas que se reordenan).
- **Prisma** + **SQL Server** (BD `BolikDigital`).
- **Zod** para toda validación; **React Hook Form** en formularios.
- **Zustand** (con `persist`) para la cotización del visitante.
- **sonner** para toasts; diálogos propios `FriendlyDialog` sobre Radix.
- **iron-session** (cookie `bolik_admin` cifrada) + **bcryptjs** para el admin. No usar Auth.js/next-auth.
- Pruebas: **Vitest**, **Playwright**, **@axe-core/playwright**, **Lighthouse CI**.
- Gestor de paquetes: **pnpm**. Node.js LTS.

## Comandos

```bash
pnpm dev              # desarrollo en http://localhost:3000
pnpm build            # build de producción (output: standalone)
pnpm start            # servir el build standalone (node .next/standalone/server.js)
pnpm start:local      # copia public/ y .next/static al standalone y lo sirve (como en IIS)
pnpm lint             # ESLint + prettier --check
pnpm format           # Prettier --write (también lo aplica el hook de Claude Code al editar)
pnpm typecheck        # tsc --noEmit
pnpm test             # Vitest (unitarias)
pnpm test:int         # Vitest (integración, BD de prueba)
pnpm test:e2e         # Playwright
pnpm test:visual      # regresión visual de /styleguide
pnpm lhci             # Lighthouse CI contra el build local
pnpm analyze          # analizador de bundles de Turbopack (next analyze), tamaño del JS por ruta
pnpm check:redirects  # mapa de redirecciones de Joomla
pnpm check:colors     # ningún color fuera de tokens.css
pnpm db:migrate       # prisma migrate dev
pnpm db:seed          # datos iniciales
pnpm db:studio        # Prisma Studio
pnpm sync:catalog     # sincroniza artículos desde SMART-K66
```

Antes de dar un ticket por terminado corre: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`.

## Estructura (resumen)

```
src/
  app/(site)/        páginas públicas (estáticas + ISR)
  app/(admin)/admin/ panel administrativo (dinámico, protegido)
  app/api/           route handlers (beacon, pdf, catálogo público)
  components/ui/     primitivas (Button, Dialog, Tabs…)
  components/        layout, feedback, motion, catálogo, cotización, hero…
  features/          lógica por dominio (catalog, quote, stores, schools, content, seo)
  server/            acceso a datos, ERP, correo, auth (solo servidor)
  lib/               utilidades puras (sin efectos)
  content/           textos de la interfaz y mensajes de feedback
  styles/            tokens.css, globals.css, backgrounds.css, motion.css
```

Detalle en `docs/04-estructura-proyecto.md`.

## Reglas que no se negocian

### Rendimiento (lo más importante junto con SEO)

- Todas las páginas públicas son **Server Components** y se generan estáticas (SSG) con revalidación por **tags**. `"use client"` solo en hojas interactivas pequeñas.
- Presupuesto de JS inicial por página: **≤ 120 KB gzip** (home) y **≤ 100 KB** (resto). Mapa, buscador (Fuse), PDF, Motion y analítica se cargan con `dynamic()` o al interactuar.
- LCP móvil **≤ 2.0 s**, INP **≤ 150 ms** (máximo 200), CLS **≤ 0.05**. Lighthouse móvil ≥ 95 en Rendimiento (≥ 90 en la home por el video) y 100 en SEO. Detalle en `docs/12`.
- Imágenes siempre con `next/image`, `sizes` correcto, `alt` real, dimensiones declaradas. `priority` **solo** en la imagen LCP.
- Fuentes con `next/font` (autohospedadas, `display: swap`, subset latin). Máximo 2 familias por página (Baloo 2 solo en la sección escuelas).
- El video del hero nunca es el LCP: el **póster** es el LCP; el video carga después de `load`, solo con buena conexión y sin `Save-Data`.

### SEO

- Cada página define `generateMetadata` o `metadata` con título único, descripción, `alternates.canonical` y Open Graph. Usa `buildMetadata()` de `src/features/seo`.
- Un solo `<h1>` por página; jerarquía de encabezados sin saltos.
- Datos estructurados JSON-LD con los helpers de `src/features/seo/jsonld.tsx`. No inventes campos (sin precios, sin reseñas).
- URLs en minúsculas, con guiones, sin acentos, sin barra final. Nunca cambies una URL publicada sin crear la redirección 301.
- Páginas de utilidad (`/buscar`, `/cotizacion`, `/cotizacion/enviada/*`, `/styleguide`, `/admin`) llevan `noindex`.

### Animación

- Anima **solo `transform` y `opacity`** (y `clip-path`/`stroke-dashoffset` en SVG). Nunca `width`, `height`, `top`, `left` ni `box-shadow` en bucles.
- Usa los tokens de `src/styles/motion.css` (`--dur-*`, `--ease-*`). Nada de duraciones inventadas.
- Todo contenido es **visible sin JavaScript**. Las animaciones de entrada parten de un estado visible o se activan solo con la clase `js` en `<html>`.
- Respeta `prefers-reduced-motion` en todo: sin desplazamientos, solo cambios de opacidad cortos.

### Interfaz y accesibilidad

- Mobile first: diseña a 360 px y luego amplía. Objetivos táctiles ≥ 44 × 44 px.
- Contraste AA mínimo. Foco visible en todo elemento interactivo.
- Botones reales (`<button>`), enlaces reales (`<a>`/`<Link>`), etiquetas reales en formularios.
- **Cada acción del usuario tiene respuesta amigable** (toast, diálogo o estado inline) según la matriz de `docs/08-styleguide.md#matriz-de-feedback`. Textos en `src/content/feedback.ts`, nunca escritos sueltos en el componente.

### Datos y seguridad

- El navegador nunca habla con SAP ni con SMART-K66: todo pasa por `src/server/erp`.
- Validación con Zod en servidor aunque ya se valide en cliente.
- Formularios públicos: honeypot + tiempo mínimo de llenado + límite por IP.
- Ningún secreto en el cliente. Variables tipadas en `src/env.ts` (servidor, esquema en `src/env.schema.ts`) y `src/env.public.ts` (solo `NEXT_PUBLIC_*`); `process.env` no se usa en ningún otro archivo salvo `src/instrumentation*.ts`, los `*.config.*` de la raíz y `scripts/` (regla de lint). La validación corre al arrancar: `next.config.ts` (dev y build) y `src/instrumentation.ts` (servidor standalone). Variable nueva = esquema + `.env.example` en el mismo PR.
- Admin: cada página y Server Action empieza con `requireRole(...)` de `src/server/auth/guards.ts`; `proxy.ts` solo comprueba la cookie.
- SQL Server: no uses `@unique` en columnas opcionales (permite un solo NULL); no hay `enum` ni `Json` en Prisma para SQL Server: usa `String` validado con constantes de `src/lib/constants.ts`.

## Convenciones

- Archivos y carpetas en `kebab-case`; componentes exportan `PascalCase`.
- Un componente por archivo. Props tipadas con `type`, no `interface`, salvo extensión.
- Server Actions en `features/<dominio>/actions.ts`, con `"use server"` y retorno `{ ok: true, data } | { ok: false, error }`.
- Consultas de BD solo en `src/server/data/*`, envueltas en caché con tags (`TAGS` en `src/lib/cache-tags.ts`).
- Mutaciones del admin: `requireRole`, validan con Zod, escriben, registran en `AuditLog`, llaman `updateTag(...)` con los tags de `lib/cache-tags.ts` y encolan IndexNow. Scripts y route handlers usan `revalidateTag(tag, "max")`.
- Commits con Conventional Commits en español y el ID del ticket: `feat(catalogo): filtros por línea [BD-060]`.
- Textos visibles en español con tildes correctas. Nada de "Lorem ipsum": usa `docs/17-copys.md`.

## Ramas, releases y tickets

- `master`: producción. Solo recibe releases; cada release lleva un tag **SemVer** (`v0.1.0` al cerrar S0, `v0.2.0` S1… `v1.0.0` en el lanzamiento; hotfix sube el parche: `v0.2.1`).
- `develop`: integración y rama por defecto. Todo trabajo sale de aquí.
- Un ticket = una rama desde `develop`: `feat/BD-NNN-slug` (también `fix/`, `chore/`, `docs/`). Entra a `develop` por PR con merge commit (sin squash), que cierra su Issue.
- Release: `release/vX.Y.Z` desde `develop` → PR a `master` → tag `vX.Y.Z` en `master` → `master` de vuelta a `develop`.
- Hotfix: `hotfix/vX.Y.Z` desde `master` → `master` (tag) y `develop`.
- Backlog maestro: `docs/14-plan-de-accion.md` y `docs/tickets.csv`. En GitHub solo se abren como Issues los tickets del sprint en curso (milestone por sprint). Un ticket nuevo usa un hueco de numeración de su épica y se agrega al doc 14 en el mismo PR.
- Alcance: se implementa el plan **completo** (los 117 tickets y los que surjan); no hay "núcleo" ni Fase posterior para recortar.
- Repo público: nunca subas `.env*` reales, credenciales, cadenas de conexión ni datos de clientes.

## Definición de terminado (por ticket)

1. Cumple todos los criterios de aceptación del ticket.
2. Funciona a 360 px, 768 px y 1280 px.
3. Teclado y lector de pantalla: navegable, foco visible, sin errores de axe.
4. Sin errores en consola; `lint`, `typecheck`, `test` y `build` en verde.
5. Si es página pública: metadata, JSON-LD, Lighthouse móvil dentro del presupuesto.
6. Si agrega una acción: tiene su mensaje en `src/content/feedback.ts` y prueba E2E del camino feliz.

## Cómo trabajar

- Usa `/ticket BD-NNN` (skill en `.claude/skills/ticket`) o lee el ticket en `docs/14-plan-de-accion.md` y los docs que cita. Flujo completo en `docs/18-playbook-claude-code.md`.
- Propón un plan antes de escribir código en todo ticket de más de 0.25 días; implementa un paso a la vez.
- Antes del PR, usa el subagente `revisor` sobre el diff.
- Cambios pequeños y revisables. No refactorices fuera del alcance del ticket.
- Si falta un dato de negocio (texto, cifra, número de WhatsApp), usa el valor de `docs/17-copys.md` o un ajuste de `SiteSetting`, nunca lo inventes en el código.
