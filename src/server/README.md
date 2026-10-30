# server/

Código **solo de servidor**: cada archivo empieza con `import "server-only"`, así el build falla si un
componente del navegador lo importa.

| Carpeta / archivo | Qué va                                                                       |
| ----------------- | ---------------------------------------------------------------------------- |
| `db.ts`           | `PrismaClient` único (BD-010)                                                |
| `data/`           | Consultas de lectura con `'use cache'` + `cacheLife` + `cacheTag`            |
| `erp/`            | Gateway hacia SMART-K66 (`noop` / `smartk66`); el navegador nunca va directo |
| `mail/`           | Transporte SMTP y plantillas de correo                                       |
| `auth/`           | Sesión iron-session, contraseñas y `requireRole`                             |
| `media/`          | Procesamiento de imágenes con sharp                                          |

Reglas:

- Las consultas a la BD viven solo en `data/`; devuelven tipos de vista (`ProductView`…), no modelos de Prisma.
- Variables de entorno solo vía `env` de `@/env`.
- Nunca se registran datos personales ni secretos en los logs.
