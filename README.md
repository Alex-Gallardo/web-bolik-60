# Bolik Digital · web-bolik-60

Nuevo sitio público y panel administrativo de **Bolik** ([www.bolik66.com](https://www.bolik66.com)), fabricante guatemalteco de útiles de escritura desde 1966 (Grupo K-66). Edición 60 años.

- **Stack:** Next.js 16 (App Router, Cache Components) · React 19 · TypeScript · Tailwind CSS v4 · Prisma + SQL Server · pnpm.
- **Prioridades:** 1) SEO y carga rápida · 2) animaciones suaves · 3) colores vivos e interfaz amigable · 4) mobile first.

## Documentación

| Qué                            | Dónde                                                                                                |
| ------------------------------ | ---------------------------------------------------------------------------------------------------- |
| Reglas del repo (leer primero) | [CLAUDE.md](CLAUDE.md)                                                                               |
| Guía completa (docs 01–18)     | [docs/README.md](docs/README.md)                                                                     |
| Plan de acción y tickets       | [docs/14-plan-de-accion.md](docs/14-plan-de-accion.md) · [docs/tickets.csv](docs/tickets.csv)        |
| Demo de referencia del diseño  | [docs/referencia/demo/index.html](docs/referencia/demo/index.html) (se abre directo en el navegador) |
| Archivos base para los tickets | [starter/](starter/) (referencia; no forma parte del build)                                          |

## Flujo de trabajo

```text
master ──●────────────────●──────────  releases con tag SemVer (v0.1.0 … v1.0.0)
          \              /
develop ───●──●────●────●────●───────  integración (rama por defecto)
               \  /  \  /
feat/BD-NNN-…   ●      ●               un ticket = una rama = un PR
```

1. Rama desde `develop`: `feat/BD-NNN-slug`.
2. Commits en español con Conventional Commits: `feat(home): hero por capítulos [BD-050]`.
3. PR a `develop` (merge commit) con `lint`, `typecheck`, `test` y `build` en verde.
4. Al cerrar cada sprint: `release/vX.Y.Z` → `master` + tag → de vuelta a `develop`.

Los tickets del sprint en curso están en los [Issues](../../issues) y [milestones](../../milestones) del repositorio.

## Desarrollo local

Requisitos: Node.js 22 LTS (`.nvmrc`) y pnpm 10 (`corepack enable`).

```bash
pnpm install
pnpm dev      # http://localhost:3000
pnpm build    # build de producción
pnpm lint
```

El resto de comandos (`typecheck`, `test`, `test:e2e`, `db:*`…) se agregan con los tickets del sprint S0; la lista completa está en [CLAUDE.md](CLAUDE.md#comandos).
