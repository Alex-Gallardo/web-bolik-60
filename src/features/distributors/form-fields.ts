/**
 * Lo del formulario «Quiero ser distribuidor» que no necesita Zod (BD-076): campos y largos. Aparte
 * de schema.ts para que la página los use sin descargar `zod/mini` al cargar (docs/12 §2).
 */

/** Largos máximos (columnas de DistributorApplication). */
export const DISTRIBUTOR_FIELD_MAX = {
  businessName: 160,
  /** «1234567-K» con guion y espacios; se guarda sin ellos (VarChar 20). */
  nit: 20,
  municipality: 80,
  name: 120,
} as const;

/** Campos en el orden en que aparecen (el foco va al primero con error). */
export const DISTRIBUTOR_FIELDS = [
  "businessName",
  "businessType",
  "nit",
  "department",
  "municipality",
  "name",
  "phone",
  "email",
] as const;

export type DistributorField = (typeof DISTRIBUTOR_FIELDS)[number];
