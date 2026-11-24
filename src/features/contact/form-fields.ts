/**
 * Lo del formulario de contacto que no necesita Zod (BD-076): campos y largos. Aparte de schema.ts
 * para que la página los use sin descargar `zod/mini` al cargar (docs/12 §2).
 */

/** Largos máximos (columnas de ContactMessage). */
export const CONTACT_FIELD_MAX = {
  name: 120,
  message: 3000,
} as const;

/** Campos en el orden en que aparecen (el foco va al primero con error). */
export const CONTACT_FIELDS = ["subject", "name", "phone", "email", "message"] as const;

export type ContactField = (typeof CONTACT_FIELDS)[number];
