import { Slot, Slottable } from "@radix-ui/react-slot";
import { cx, type VariantProps } from "class-variance-authority";
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
 * `className` es para agregar (margen, ancho, posición). No sobrescribe lo que ya fija el botón,
 * porque gana la clase que va después en el CSS y no la última escrita: display (`hidden
 * md:inline-flex` no oculta), radio, peso de letra, alto, padding ni white-space. Para eso, envuelve
 * el botón en un contenedor (`<div className="hidden md:block">`) o usa el sufijo `!` (`hidden!`).
 */
import { buttonVariants } from "./button-variants";

export { buttonVariants };

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
     * Solo en componentes cliente: el estado de carga vive en el navegador. La región va como
     * hermana del botón: no ocupa espacio, pero cuenta para `space-x-*`, `divide-*` y `last:`.
     */
    loading?: boolean;
    /** Lo que se anuncia mientras carga (por defecto "Enviando…"). */
    /* Con asChild, el onClick va en Button y no en el hijo: Radix llama primero al del hijo. */
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
  // Dónde va el spinner si no hay ícono inicial que reemplazar: junto al texto sin ocupar espacio,
  // en el margen interno (asChild, el texto vive en el hijo) o en el flujo (link: no tiene margen).
  const spinner =
    !busy || startIcon ? null : variant === "link" ? "inline" : asChild ? "padding" : "beside-text";

  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    // Cargando: ni el clic ni el envío del formulario (Enter en un campo también llega aquí). Un
    // enlace deshabilitado (asChild) tampoco: un lector de pantalla todavía puede activarlo.
    if (busy || (asChild && disabled)) {
      event.preventDefault();
      return;
    }
    onClick?.(event);
  }

  // Al cargar, el spinner reemplaza al ícono inicial en una caja de su mismo tamaño.
  const leading = startIcon ? (
    busy ? (
      <span className={cx("inline-flex shrink-0 items-center justify-center", iconBox)}>
        <Spinner />
      </span>
    ) : (
      startIcon
    )
  ) : null;

  return (
    <>
      <Comp
        className={buttonVariants({
          variant,
          size,
          block,
          // El spinner en el margen interno (asChild) se posiciona respecto del botón.
          className: cx(spinner === "padding" && "relative", className),
        })}
        {...(asChild
          ? // Un <a> no tiene disabled: aria-disabled y fuera del orden de tabulación.
            {
              "aria-disabled": disabled || busy || undefined,
              // Cargando conserva su lugar en el orden de tabulación (el foco no se pierde).
              tabIndex: disabled ? -1 : undefined,
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
        {spinner === "padding" ? (
          <Spinner className={cx("absolute", SPINNER_OFFSET[size ?? "md"])} />
        ) : null}
        {spinner === "inline" ? <Spinner /> : null}
        {asChild ? (
          <Slottable>{children}</Slottable>
        ) : (
          // El spinner se pega a la izquierda del texto sin ocupar espacio: el ancho no cambia,
          // tampoco en un botón de ancho completo.
          <span className="relative">
            {spinner === "beside-text" ? (
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
