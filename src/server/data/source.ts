import "server-only";
import { env } from "@/env";
import type { DataSource } from "./types";

/**
 * Fuente de datos según DATA_SOURCE: `fixtures` lee prisma/seed/*.json (BD-037); `db` es SQL
 * Server con Prisma (BD-032). Con SKIP_ENV_VALIDATION (CI) la variable puede faltar: cuenta como
 * fixtures, el valor por defecto. Cada fuente se importa al pedirla: con `db` no se cargan los
 * JSON de ejemplo y con `fixtures` no se abre la conexión a la base. Cambiar DATA_SOURCE exige un
 * build nuevo: las páginas se prerenderizan con la fuente que había al construir.
 */
export async function dataSource(): Promise<DataSource> {
  if (env.DATA_SOURCE === "db") {
    const { dbSource } = await import("./db/source");
    return dbSource;
  }
  const { fixturesSource } = await import("./fixtures/source");
  return fixturesSource;
}
