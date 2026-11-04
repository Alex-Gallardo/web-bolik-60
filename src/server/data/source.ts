import "server-only";
import { env } from "@/env";
import type { DataSource } from "./types";

/**
 * Fuente de datos según DATA_SOURCE (BD-037): `fixtures` lee prisma/seed/*.json; `db` será SQL
 * Server con Prisma (BD-032). Con SKIP_ENV_VALIDATION (CI) la variable puede faltar: cuenta como
 * fixtures, el valor por defecto. La fuente se importa al pedirla, así los JSON de ejemplo no se
 * cargan con DATA_SOURCE=db. Cambiar DATA_SOURCE exige un build nuevo: las páginas se prerenderizan.
 */
export async function dataSource(): Promise<DataSource> {
  if (env.DATA_SOURCE === "db") {
    throw new Error("DATA_SOURCE=db todavía no tiene fuente: la de Prisma llega en BD-032.");
  }
  const { fixturesSource } = await import("./fixtures/source");
  return fixturesSource;
}

/** Slug válido o undefined: lo que llega de la URL no crea entradas de caché arbitrarias. */
export function safeSlug(value: string | undefined): string | undefined {
  return value && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) && value.length <= 100
    ? value
    : undefined;
}
