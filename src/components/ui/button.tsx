import { Slot, Slottable } from "@radix-ui/react-slot";
import { cva, cx, type VariantProps } from "class-variance-authority";
import type { ComponentProps, MouseEvent, ReactNode } from "react";
import { ui } from "@/content/ui";
import { Spinner } from "./spinner";

/**
 * Botón único del sitio (docs/08 §2, BD-021). Sin "use client": sirve en Server Components.
 * Todas llevan borde de 2 px (transparente si no se ve) para igualar la altura; el color del borde
 * va en cada variante, nunca en la base (sin tailwind-merge, la base podría ganarle). Sin transición
 * de color (solo se anima transform y opacity): el hover cambia el color en el acto y .press da el
 * scale(.97) al presionar. El foco visible lo pone globals.css.
 *
 * Las clases se unen con cx (clsx) y no con cn: tailwind-merge pesa ~9 KB gzip en el navegador
 * cuando el botón vive en un componente cliente. Por eso ninguna variante choca con otra (los
 * tamaños solo se aplican a las variantes con caja, el estado de carga usa variantes de CSS) y
 * `className` es para agregar (margen, ancho), no para cambiar alto ni padding.
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
  "press relative inline-flex items-center justify-center gap-2 rounded-md border-2 font-bold disabled:cursor-not-allowed disabled:opacity-60 aria-busy:cursor-progress aria-disabled:pointer-events-none aria-disabled:not-aria-busy:opacity-60 [&_svg]:shrink-0",
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

/** Con asChild el texto vive en el hijo: el spinner va en el margen interno izquierdo. */
const SPINNER_OFFSET = { sm: "left-1", md: "left-1.5", lg: "left-2" } as const;

type ButtonProps = ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    /**
     * Aplica el estilo al hijo (un <Link> o <a>) en lugar de dibujar un <button>. Un enlace
     * deshabilitado no debe recibir href: un lector de pantalla todavía podría activarlo.
     */
    asChild?: boolean;
    /**
     * Estado de carga: muestra el spinner, ignora los clics (también el envío del formulario) y lo
     * anuncia a lectores de pantalla. No usa `disabled` para que el foco no se pierda. Un botón que
     * va a cargar debe recibir `loading={false}` desde el inicio: así su región de aviso ya existe
     * cuando cambia, y los lectores la anuncian. Sin la prop no se dibuja ninguna región.
     * Solo en componentes cliente: el estado de carga vive en el navegador.
     */
    loading?: boolean;
    /** Lo que se anuncia mientras carga (por defecto "Enviando…"). */
    loadingText?: string;
    startIcon?: ReactNode;
    endIcon?: ReactNode;
  };

export function Button({
  className,
  variant,
  size,
  block,
  asChild = false,
  loading,
  loadingText = ui.loading.sending,
  startIcon,
  endIcon,
  disabled,
  type,
  onClick,
  children,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  const busy = loading === true;
  const iconBox = size === "sm" ? "size-4" : "size-5";

  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    // Cargando: ni el clic ni el envío del formulario (Enter en un campo también llega aquí).
    if (busy) {
      event.preventDefault();
      return;
    }
    onClick?.(event);
  }

  // Al cargar, el spinner reemplaza al ícono inicial en una caja de su mismo tamaño.
  const leading = startIcon ? (
    busy ? (
      <span className={cx("inline-flex items-center justify-center", iconBox)}>
        <Spinner />
      </span>
    ) : (
      startIcon
    )
  ) : null;

  return (
    <>
      <Comp
        className={buttonVariants({ variant, size, block, className })}
        {...(asChild
          ? // Un <a> no tiene disabled: aria-disabled y fuera del orden de tabulación.
            {
              "aria-disabled": disabled || busy || undefined,
              tabIndex: disabled || busy ? -1 : undefined,
            }
          : { type: type ?? "button", disabled, "aria-disabled": busy || undefined })}
        aria-busy={busy || undefined}
        // Sin onClick ni loading no se pasa ningún manejador: el botón sigue sirviendo en Server
        // Components (no admiten funciones como props). `loading` es estado del navegador.
        onClick={onClick !== undefined || loading !== undefined ? handleClick : undefined}
        {...props}
      >
        {leading}
        {/* Slottable debe ser hijo directo de Slot: nada de fragmentos aquí. */}
        {asChild && busy && !startIcon ? (
          <Spinner className={cx("absolute", SPINNER_OFFSET[size ?? "md"])} />
        ) : null}
        {asChild ? (
          <Slottable>{children}</Slottable>
        ) : (
          // El spinner se pega a la izquierda del texto sin ocupar espacio: el ancho no cambia,
          // tampoco en un botón de ancho completo.
          <span className="relative">
            {busy && !startIcon ? (
              <Spinner className="absolute inset-y-0 right-full my-auto mr-2" />
            ) : null}
            {children}
          </span>
        )}
        {endIcon}
      </Comp>
      {/* Región viva fuera del botón (dentro, los lectores la ignoran); solo si puede cargar. */}
      {loading !== undefined ? (
        <span role="status" className="sr-only">
          {busy ? loadingText : ""}
        </span>
      ) : null}
    </>
  );
}
