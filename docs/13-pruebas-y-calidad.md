# 13 · Pruebas y calidad

Regla: **ningún ticket se cierra sin su prueba** (ver "Definición de terminado" en `CLAUDE.md`). Las pruebas corren en local y en CI; un PR con pruebas en rojo no se fusiona.

## 1. Pirámide de pruebas

```mermaid
flowchart TB
  M["Manual / QA exploratorio<br/>(antes de cada release)"]
  L["Lighthouse CI + axe<br/>(rendimiento, SEO, accesibilidad)"]
  E["E2E con Playwright<br/>(flujos críticos, móvil y escritorio)"]
  I["Integración con Vitest<br/>(server actions, data layer, BD de prueba)"]
  U["Unitarias con Vitest<br/>(utilidades, esquemas Zod, store, SEO)"]
  M --- L --- E --- I --- U
```

| Nivel | Herramienta | Dónde | Cuándo corre | Meta |
|---|---|---|---|---|
| Estático | `tsc --noEmit`, ESLint, Prettier | todo | pre-commit + CI | 0 errores |
| Unitarias | Vitest 5 + Testing Library | `src/**/*.test.ts(x)` | pre-push + CI | ≥ 80 % de líneas en `src/lib`, `src/features/*/schema.ts`, `src/features/seo` |
| Integración | Vitest + SQL Server de prueba (Docker) | `tests/integration` | CI | Todas las server actions de formularios |
| E2E | Playwright 1.64 | `tests/e2e` | CI (contra `pnpm build && pnpm start`) | 100 % de los flujos críticos |
| Accesibilidad | `@axe-core/playwright` | dentro de E2E | CI | 0 violaciones serias/críticas |
| Rendimiento/SEO | Lighthouse CI 0.15 | `tests/lighthouserc.json` | CI + nocturno | Doc 12 §1 |
| Visual | Playwright `toHaveScreenshot` sobre `/styleguide` | `tests/visual` | CI | 0 diferencias no aprobadas |
| Enlaces y redirecciones | `scripts/check-redirects.ts`, `scripts/check-links.ts` | — | CI + antes del corte | 0 rotos |

## 2. Configuración

### Vitest (`vitest.config.mts`)

```ts
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true, // alias @/ nativo de Vite (sin vite-tsconfig-paths)
    alias: { "server-only": fileURLToPath(new URL("./tests/stubs/server-only.ts", import.meta.url)) },
  },
  test: {
    environment: "jsdom", // las pruebas puras declaran // @vitest-environment node (más rápidas)
    setupFiles: ["./tests/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      include: ["src/lib/**/*.{ts,tsx}", "src/features/*/{schema,schemas}.ts", "src/features/seo/**/*.{ts,tsx}"],
      exclude: ["**/*.test.{ts,tsx}"],
      thresholds: { lines: 80 },
    },
  },
});
```

`.mts` para que Node la cargue como ESM. El umbral se aplica en `pnpm test:coverage`, que corre en el `pre-push` y en CI.

Integración en un proyecto aparte (`vitest.integration.config.mts`, `environment: "node"`, `include: ["tests/integration/**/*.test.ts"]`) con `TEST_DATABASE_URL` apuntando a la base `BolikDigital_Test`, a la que `tests/integration/global-setup.ts` aplica las migraciones pendientes (`prisma migrate deploy`, nunca borra) antes de la suite; cada prueba limpia los datos que crea. Para dejarla en cero, una persona corre `pnpm db:reset:test` (se niega si la base no termina en `_Test`); Prisma bloquea `migrate reset` cuando lo lanza un agente de IA. Ojo: con `NODE_ENV=test`, `@next/env` no carga `.env.local`; la configuración de integración debe leer `TEST_DATABASE_URL` de forma explícita (por ejemplo, cargando `.env.local` con `loadEnvConfig` y pasando esa URL como `DATABASE_URL` a la suite).

SQL Server local para desarrollo y pruebas (BD-017): **SQL Server 2022 Express** instalado con `scripts/dev/sqlserver-local.ps1`, que se corre una vez en PowerShell como administrador. Crea `BolikDigital_Dev`, `BolikDigital_Shadow` y `BolikDigital_Test` con el login `bolik_app` y escribe `DATABASE_URL`, `SHADOW_DATABASE_URL` y `TEST_DATABASE_URL` en `.env.local`. Intercalación: la del Windows donde se instala (en español, `Modern_Spanish_CI_AS`: sin distinguir mayúsculas y con orden correcto de ñ y tildes); al conectar la base real, confirmar con TI que use la misma. Cuando exista la base real, solo cambia `DATABASE_URL`.

```powershell
powershell -ExecutionPolicy Bypass -File scripts\dev\sqlserver-local.ps1
```

En la CI (BD-014) se usa un contenedor de SQL Server 2022 Express con la misma intercalación (`scripts/ci/sqlserver.sh`): crea `BolikDigital_Test` y el login `bolik_app` con contraseñas aleatorias en cada corrida, ocultas del log; el repo no guarda ningún secreto.

### CI (`.github/workflows/ci.yml`)

Corre en cada PR y cada push a `develop` y `master`, en máquinas de GitHub (gratis en repo público). Un push nuevo al mismo PR cancela la corrida anterior. Cinco trabajos, todos obligatorios para fusionar (protección de ramas):

| Trabajo | Qué hace |
|---|---|
| **Calidad** | `pnpm typecheck`, `pnpm lint`, `pnpm test:coverage` |
| **Integración** | SQL Server en contenedor + `pnpm test:int` (aplica migraciones con `migrate deploy`) |
| **Build** | Instala con `--config.node-linker=hoisted` (`node_modules` plano, sin los enlaces de pnpm), `pnpm build` y el paquete de docs/15 §5 (`scripts/ci/package.sh`), publicado como artefacto `bolik-standalone` (tar.gz, 90 días) |
| **Artefacto en Windows** | En una máquina Windows extrae el paquete con `tar` y lo arranca con `node server.js`: el servidor de producción es Windows |
| **E2E** | Descarga el artefacto, lo arranca con `node server.js` en `127.0.0.1:3100` (`scripts/ci/serve-artifact.sh`) y corre `pnpm test:e2e` contra él; el reporte de Playwright queda como artefacto |

Las variables son valores de prueba en el propio workflow (`APP_ENV=development`), sin `SKIP_ENV_VALIDATION`: la validación real también se prueba. Las acciones van fijadas por SHA.

### Playwright (`playwright.config.ts`)

Implementado en BD-013. Puntos clave del archivo de la raíz:

- Proyectos `movil` (Pixel 7, primero: el sitio es mobile first), `escritorio` (Desktop Chrome) e `iphone` (iPhone 14, WebKit), este último solo con las pruebas marcadas `@critico`.
- Navegadores, una vez por máquina: `pnpm exec playwright install chromium webkit` (en la CI, con `--with-deps`).
- Corre contra el **build de producción**: local, `pnpm build` y luego `pnpm test:e2e`; Playwright levanta siempre un `pnpm start:local` nuevo en `127.0.0.1:3100` (el puerto debe estar libre; no usa el 3000 para no confundirse con `pnpm dev`). `start:local` carga los `.env*` del proyecto, como lo haría el servicio en IIS, pero Playwright fuerza `ERP_MODE=noop` y `SMTP_MODE=file`. Ojo: `APP_ENV` sigue siendo el de tu `.env.local` (`development`), así que lo que dependa de él (analítica, robots) no se comporta como en producción.
- Con `E2E_BASE_URL` no se levanta servidor: la CI (BD-014) arranca el artefacto con `node server.js` y prueba contra esa dirección.
- En CI: `retries: 2`, `forbidOnly` y traza en el primer reintento.

Helpers en `tests/e2e/helpers.ts` (las specs importan `test` y `expect` de ahí, no de `@playwright/test`):

- `test`: salta el splash en todas las pruebas; la del splash usa `test.use({ showSplash: true })`.
- `expectNoA11yViolations(page)`: axe con WCAG 2.0/2.1 A y AA; adjunta el resultado y falla con violaciones serias o críticas.
- `collectConsoleErrors(page)`: errores de consola y excepciones, sin los avisos conocidos de `KNOWN_CONSOLE_ERRORS` (cada uno dice en qué ticket se quita).

Datos E2E: `pnpm db:seed --profile e2e` carga categorías, 6 productos (incluye Bolik Ultra con sus 3 variantes), 2 departamentos con 4 tiendas, 1 kit y FAQs. `ERP_MODE=noop` y `SMTP_MODE=file` (los correos se escriben en `tmp/mails/*.eml` para poder verificarlos).

El splash se desactiva en E2E con `sessionStorage.setItem("bolik_splash","1")` en un `addInitScript` (fixture `page` de `tests/e2e/helpers.ts`), salvo en su prueba específica.

## 3. Pruebas unitarias (qué probar)

| Módulo | Casos |
|---|---|
| `features/quote/store.ts` | agregar línea; sumar cantidad si se repite SKU + empaque; quitar; cambiar cantidad (mín. 1, máx. 9999); persistencia y migración de versión; vaciar tras enviar |
| `features/quote/schema.ts` (Zod) | teléfono GT (8 dígitos, acepta `+502`, espacios y guiones); NIT opcional con formato válido o "CF"; correo; al menos 1 línea; máximo 50 líneas; honeypot vacío |
| `features/seo/jsonld.tsx` | `productLd` incluye `hasVariant` con `sku` y `gtin12` solo si el código es válido; sin `offers`; `storesLd` omite `geo` si no está verificada |
| `features/seo/metadata.ts` | canonical absoluto; título con plantilla; `noindex` respetado; descripción ≤ 160 caracteres |
| `features/seo/legacy-redirects.ts` + `proxy.ts` | cada URL de la tabla del doc 10 §6 → destino esperado; conserva `utm_*`; decodifica `%20` y mayúsculas |
| `lib/format.ts` · `lib/slug.ts` | números y fechas `es-GT` (hora de Guatemala); teléfonos GT (`normalizeGtPhone`, `formatPhone`); `slugify` con tildes y ñ |
| `lib/whatsapp.ts` | mensaje prellenado con producto, SKU, empaque y URL; codificación correcta |
| `lib/image-loader.ts` | elige el ancho generado más cercano hacia arriba; nunca un ancho inexistente |
| `content/feedback.ts` | todas las funciones devuelven título y texto no vacíos (prueba de humo) |
| `components/motion/count-up.tsx` | con `prefers-reduced-motion` muestra el valor final sin animar |

## 4. Pruebas de integración

| Server action / módulo | Casos |
|---|---|
| `submitQuote` | crea `QuoteRequest` + `QuoteItem`; folio `COT-2026-000001` y consecutivo; dos envíos simultáneos no duplican folio (`Promise.all` de 20); envía correo interno y acuse; con `ERP_MODE=smartk66` y API caída deja `erpStatus = "pendiente"` sin fallar al usuario |
| `submitSchoolVisit`, `submitDistributor`, `submitContact` | validación servidor; folio `ESC`/`DIS`; límite de 5 envíos por IP en 10 min |
| `server/folio.ts` | cambio de año reinicia el consecutivo |
| `server/data/*` | solo devuelve `published = true`; orden; relaciones |
| Acciones del admin | sin sesión → error; rol `ventas` no edita productos; guarda `AuditLog`; llama `updateTag` (mock) y `enqueueIndexNow` |
| `scripts/sync-catalog.ts` | con API simulada (MSW): crea, actualiza, desactiva variantes; registra `SyncRun`; no pisa campos editoriales |
| Subida de medios | genera 6 anchos + blur; rechaza > 10 MB y tipos no permitidos |

## 5. Pruebas E2E (flujos críticos)

Etiqueta `@critico` = corre también en iPhone y bloquea el release.

| Archivo | Flujo | Verificaciones clave |
|---|---|---|
| `home.spec.ts` @critico | Abrir `/` | H1 visible; hero con póster; capítulos navegables con teclado; CTA "Cotizar" abre drawer; sin errores de consola |
| `splash.spec.ts` | Primera visita a `/` | `html[data-splash="on"]` y desaparece en ≤ 2.3 s; segunda visita sin splash; `Escape` lo salta; en `/productos` nunca aparece; con UA `Googlebot` nunca aparece |
| `catalogo.spec.ts` | `/productos` → filtro → categoría → ficha | filtros sin recarga; URL con `?uso=`; breadcrumbs; JSON-LD presente |
| `ficha.spec.ts` @critico | Ficha Bolik Ultra | cambiar color cambia imagen y SKU visible; elegir empaque; agregar a cotización muestra toast y badge; WhatsApp abre con mensaje correcto |
| `cotizacion.spec.ts` @critico | Agregar 2 productos → `/cotizacion` → enviar | validaciones amigables; diálogo de éxito con folio; `/cotizacion/enviada`; carrito vacío; correo en `tmp/mails` |
| `cotizacion-error.spec.ts` | Servidor responde 500 (route intercept) | diálogo de error amigable; datos del formulario se conservan; botón reintentar |
| `buscador.spec.ts` | Abrir con `/` o ícono; buscar "ultra", "pt00058", "759364663092", "crayon" (sin tilde) | resultados correctos; vacío muestra sugerencias |
| `donde-comprar.spec.ts` @critico | Elegir departamento; "usar mi ubicación" (geolocalización simulada) | lista filtrada; enlace "Cómo llegar" con coordenadas; mapa carga solo al verse |
| `qr.spec.ts` | `/p/PT00058` | 301 a la ficha con `?color=azul` |
| `redirecciones.spec.ts` | Todas las URL de Joomla del mapa | 301 y destino 200 |
| `escuelas.spec.ts`, `mayoreo.spec.ts`, `contacto.spec.ts` | Envío de formularios | diálogo de éxito y registro en BD |
| `admin.spec.ts` | Login, crear producto, publicar, ver en sitio; cambiar estado de cotización | sesión; la ficha aparece sin redeploy (caché invalidada) |
| `seo.spec.ts` | Cada ruta pública | un solo H1; `<title>` y `description` únicos; canonical; `robots` correcto; `sitemap.xml`, `robots.txt`, `llms.txt` responden 200 |
| `sin-js.spec.ts` | `javaScriptEnabled: false` | home, catálogo y ficha muestran contenido completo; formularios muestran el mensaje "activa JavaScript o escríbenos por WhatsApp" |

Ejemplo:

```ts
// tests/e2e/cotizacion.spec.ts
import { expect, expectNoA11yViolations, test } from "./helpers";

test("@critico enviar cotización desde la ficha", async ({ page }) => {
  await page.goto("/productos/boligrafos/bolik-ultra");
  await page.getByRole("radio", { name: "Negro" }).check();
  await page.getByRole("radio", { name: /Cajilla de 12/ }).check();
  await page.getByRole("button", { name: "Agregar a cotización" }).click();
  await expect(page.getByRole("status")).toContainText("Agregado");
  await expect(page.getByTestId("quote-badge")).toHaveText("1");

  await page.goto("/cotizacion");
  await page.getByLabel("Nombre").fill("Ana Pérez");
  await page.getByLabel("Teléfono").fill("5555 1234");
  await page.getByLabel("Correo").fill("ana@example.com");
  await page.getByLabel("Departamento").selectOption("guatemala");
  await page.getByRole("button", { name: "Enviar cotización" }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText(/COT-\d{4}-\d{6}/);
  await expectNoA11yViolations(page);
});
```

## 6. Accesibilidad

- axe en cada spec E2E (helper `expectNoA11yViolations(page)`).
- Manual, antes de cada release: navegar home → ficha → cotización **solo con teclado**; probar con lector de pantalla (NVDA en Windows, VoiceOver en iPhone) los diálogos, toasts (`aria-live`) y el hero.
- Contraste ≥ 4.5:1 en texto (los tokens del doc 02 ya cumplen; no inventar colores).
- Zoom 200 % sin scroll horizontal; objetivos táctiles ≥ 44 × 44 px.
- `prefers-reduced-motion`: sin splash animado, sin video automático, reveals instantáneos.

## 7. Lighthouse CI

`starter/tests/lighthouserc.json` (incluido): 5 URLs, 3 corridas cada una, preset móvil, aserciones del doc 12 y `budget.json`. En CI corre contra el build de producción con datos de seed. Un fallo en SEO (< 100) o en rendimiento (< 90 en home, < 95 en el resto) bloquea el PR.

## 8. Regresión visual

`tests/visual/styleguide.spec.ts` toma capturas de cada sección de `/styleguide` (botones, tarjetas, formularios, diálogos, toasts, fondos) en móvil y escritorio, con animaciones desactivadas (`animations: "disabled"`). Si un cambio es intencional: `pnpm test:visual --update-snapshots` y el PR lo explica.

## 9. QA manual (antes de cada release)

Dispositivos mínimos: Android de gama media (Chrome), iPhone (Safari), Windows (Edge y Chrome), una tablet. Red: "Fast 4G" y "Slow 4G" en DevTools.

- [ ] Splash: aparece una vez, dura 2 s, se puede saltar, no aparece al recargar en la misma sesión.
- [ ] Hero: póster inmediato, video suave, capítulos cambian sin saltos, pausa al salir de pantalla.
- [ ] Todas las acciones dan un mensaje amigable (matriz del doc 08): agregar, quitar, enviar, error, sin conexión, copiar, ubicación denegada.
- [ ] Formularios: errores claros en español, sin perder datos, teclado numérico en teléfono.
- [ ] Imágenes nítidas en pantallas retina y sin saltos de diseño.
- [ ] Textos: sin "lorem", sin datos inventados, tildes correctas.
- [ ] Enlaces externos (Walmart, La Torre, Maps, WhatsApp, Facebook) abren en pestaña nueva y funcionan.
- [ ] Admin: los cambios aparecen en el sitio en menos de 1 minuto.
- [ ] 404 amigable con buscador; 500 amigable con WhatsApp.

## 10. Checklist de release

- [ ] CI en verde (tipos, lint, unit, integración, E2E, axe, Lighthouse, visual).
- [ ] `pnpm check:redirects` y `pnpm check:links` sin errores contra el entorno de staging.
- [ ] Migraciones probadas en una copia de la BD de producción.
- [ ] Respaldo de BD y de `D:\bolik\media` antes de desplegar.
- [ ] Variables de entorno de producción revisadas (`APP_ENV=production`, `ERP_MODE`, SMTP, `INDEXNOW_KEY`, `SESSION_SECRET`).
- [ ] QA manual completo y firmado en el ticket del release.
- [ ] Plan de reversión listo (doc 15 §8).
