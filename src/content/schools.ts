/**
 * Página /escuelas, «Bolik en tu escuela» (docs/17 §4 y §6, docs/10 §1, docs/06 §3.9, BD-105). Los
 * textos del formulario están en content/forms.ts (schoolForm); los de sus avisos, en
 * content/feedback.ts.
 */
export const schoolsPage = {
  title: "¡Aprender a escribir es una aventura!",
  /** docs/10 §1. */
  metaTitle: "Bolik en tu escuela: talleres y actividades",
  /** docs/17 §6. */
  metaDescription:
    "Bolik en tu escuela: talleres de escritura, dibujo y creatividad para colegios de Guatemala. Solicita una visita para tus alumnos.",
  /** «Sin costo para la institución» validado por el usuario (27 nov 2026). */
  intro:
    "Llevamos talleres de escritura, dibujo y creatividad a colegios y escuelas de Guatemala. Sin costo para la institución.",
  /** Botón del hero: baja al formulario. */
  formCta: "Lleva Bolik a tu escuela",
  stepsTitle: "Cómo funciona",
  /** El paso 4 validado por el usuario (27 nov 2026). */
  steps: [
    "Nos escribes",
    "Coordinamos la fecha",
    "Visitamos tu escuela",
    "Entregamos material para cada niño",
  ],
  activitiesTitle: "Actividades para escuelas",
  statsTitle: "Bolik en las escuelas",
  faqTitle: "Preguntas frecuentes",
} as const;
