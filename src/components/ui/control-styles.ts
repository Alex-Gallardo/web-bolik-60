/**
 * Clases compartidas de los campos de formulario (docs/08 §1 y §2, BD-022): 52 px de alto, borde
 * de 2 px --line-control (3:1, WCAG 1.4.11) que pasa a --blue con el foco y a --danger con error.
 * Sin tailwind-merge: estos controles viven en formularios cliente (ver button.tsx). Por eso no
 * fijan el ancho: cada control pone el suyo (w-full, o w-24 en QuantityStepper) sin choques.
 */
export const controlClasses =
  "rounded-md border-2 border-line-control bg-paper px-4 text-base text-ink placeholder:text-muted focus-visible:border-blue aria-invalid:border-danger disabled:cursor-not-allowed disabled:opacity-60";

/** Alto de una línea (input, select). */
export const singleLineClasses = "h-13";
