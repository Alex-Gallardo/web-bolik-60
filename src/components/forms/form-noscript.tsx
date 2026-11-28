import { formNoScript } from "@/content/forms";
import { formatPhone } from "@/lib/format";

type FormNoScriptProps = {
  /** El enlace de WhatsApp (null: sin número configurado) y el número para mostrar. */
  whatsappUrl: string | null;
  whatsappNumber: string | null;
  className?: string;
};

/**
 * Aviso sin JavaScript de los formularios públicos (doc 17 §5): «Para enviar este formulario activa
 * JavaScript o escríbenos por WhatsApp al {numero}.» Solo lo pinta el navegador sin JS
 * (<noscript>). Lo usan /cotizacion (BD-072) y /escuelas (BD-105); BD-106 y BD-111 lo suman.
 */
export function FormNoScript({ whatsappUrl, whatsappNumber, className }: FormNoScriptProps) {
  return (
    <noscript>
      <p
        className={`rounded-lg border-2 border-s-4 border-line border-s-warning bg-paper px-4 py-3 ${className ?? ""}`}
      >
        {formNoScript.text}
        {whatsappUrl && whatsappNumber ? (
          <>
            {" "}
            {formNoScript.whatsapp}{" "}
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
              {formatPhone(whatsappNumber)}
            </a>
          </>
        ) : null}
        .
      </p>
    </noscript>
  );
}
