import type { CustomerType } from "@/lib/constants";

/**
 * Lo del formulario de /cotizacion que no necesita Zod (BD-072): campos, largos y tipos de cliente.
 * Aparte de schema.ts para que la página los use sin descargar `zod/mini` al cargar: el esquema
 * llega con el primer uso del formulario (docs/12 §2).
 */

/** Largos máximos (columnas de QuoteRequest, SQL Server). */
export const QUOTE_FIELD_MAX = {
  organization: 160,
  name: 120,
  department: 40,
  municipality: 80,
  notes: 2000,
} as const;

/** Tipos de cliente que ofrece el formulario (doc 17 §`/cotizacion`); la base acepta más. */
export const QUOTE_FORM_CUSTOMER_TYPES = [
  "libreria",
  "empresa",
  "colegio",
  "otro",
] as const satisfies readonly CustomerType[];

/** «Otro» no pide institución (doc 17: «opcional para "Otro"»). */
export const organizationRequired = (customerType: unknown) => customerType !== "otro";

/** Campos del formulario, en el orden en que aparecen (el foco va al primero con error). */
export const QUOTE_CONTACT_FIELDS = [
  "customerType",
  "organization",
  "name",
  "phone",
  "email",
  "department",
  "municipality",
  "notes",
] as const;

export type QuoteContactField = (typeof QUOTE_CONTACT_FIELDS)[number];
