import { cva } from "class-variance-authority";

/**
 * Clases del botón (docs/08 §2, BD-021), aparte de button.tsx: un componente cliente que solo
 * necesita las clases (un <Link> con aspecto de botón, BD-050) las importa sin arrastrar Slot,
 * el spinner ni los textos del botón. La explicación de cada decisión está en button.tsx.
 */
/** Variantes con fondo o borde (todas menos link): llevan alto y padding por tamaño. */
const BOXED = [
  "primary",
  "accent",
  "dark",
  "outline",
  "ghost-light",
  "whatsapp",
  "danger",
] as const;

export const buttonVariants = cva(
  // Cargando (aria-busy) también lleva aria-disabled, pero se ve con su color normal.
  // Sin "relative" en la base: así `fixed`/`absolute` en className funcionan (botón flotante).
  // Cargando sigue recibiendo el puntero (cursor de espera); handleClick bloquea el clic.
  "press inline-flex items-center justify-center gap-2 rounded-md border-2 font-bold disabled:cursor-not-allowed disabled:opacity-60 aria-busy:cursor-progress aria-disabled:not-aria-busy:pointer-events-none aria-disabled:not-aria-busy:opacity-60 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Acción principal sobre fondo claro.
        primary: "border-transparent bg-blue text-paper hover:bg-blue-700",
        // Acción principal sobre fondo oscuro (hero, navy).
        accent: "border-transparent bg-yellow text-ink hover:bg-yellow-600",
        // Alternativa sobria.
        dark: "border-transparent bg-ink text-paper hover:bg-navy",
        // Secundario sobre fondo claro.
        outline: "border-ink text-ink hover:bg-soft",
        // Secundario sobre fondo oscuro.
        "ghost-light": "border-paper text-paper hover:bg-paper/10",
        // Solo WhatsApp.
        whatsapp: "border-transparent bg-whatsapp text-paper hover:bg-whatsapp-700",
        // Acciones destructivas (admin): borrar, descartar.
        danger: "border-transparent bg-red text-paper hover:bg-red-700",
        // Acciones terciarias.
        link: "border-transparent text-blue underline-offset-4 hover:underline",
      },
      // Texto e íconos; el alto y el padding van en compoundVariants (solo variantes con caja).
      size: {
        sm: "text-sm [&_svg]:size-4",
        md: "text-base [&_svg]:size-5",
        lg: "text-lg [&_svg]:size-5",
      },
      // Ancho completo en móvil (CTAs de formulario): el texto largo puede partirse en dos líneas.
      block: { true: "w-full text-center sm:w-auto", false: "whitespace-nowrap" },
    },
    compoundVariants: [
      // El margen interno deja sitio al spinner sin mover el texto.
      { variant: [...BOXED], size: "sm", class: "h-10 px-6" }, // solo admin y escritorio (< 44 px)
      { variant: [...BOXED], size: "md", class: "min-h-12.5 px-7" },
      { variant: [...BOXED], size: "lg", class: "min-h-14 px-8" },
      // El enlace no lleva caja: el área táctil mínima (44 × 44) la dan el alto y el ancho mínimos.
      { variant: "link", class: "min-h-11 min-w-11" },
    ],
    defaultVariants: { variant: "primary", size: "md", block: false },
  },
);
