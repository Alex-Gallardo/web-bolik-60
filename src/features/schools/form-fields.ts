/**
 * Lo del formulario «Lleva Bolik a tu escuela» que no necesita Zod (BD-076): campos y largos. Aparte
 * de schema.ts para que la página los use sin descargar `zod/mini` al cargar (docs/12 §2).
 */

/** Largos máximos (columnas de SchoolVisitRequest). */
export const SCHOOL_FIELD_MAX = {
  schoolName: 160,
  municipality: 80,
  name: 120,
} as const;

/** «Alumnos aproximados»: de 1 a este número. */
export const SCHOOL_MAX_STUDENTS = 9_999;

/** Campos en el orden en que aparecen (el foco va al primero con error). */
export const SCHOOL_FIELDS = [
  "schoolName",
  "level",
  "students",
  "department",
  "municipality",
  "name",
  "phone",
  "email",
  "preferredMonth",
] as const;

export type SchoolField = (typeof SCHOOL_FIELDS)[number];
