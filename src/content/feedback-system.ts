import type { ToastTone } from "./feedback";

/**
 * Mensajes del sistema (conexión y pantalla de error, BD-024 y BD-046), parte de content/feedback.ts
 * (`feedback.system`). Aparte porque la pantalla de error de Next se carga en todas las páginas:
 * si importara todo feedback.ts, cada mensaje nuevo pesaría en el JS de todo el sitio (docs/12 §2).
 * Úsalos como `feedback.system`; solo error-screen y global-error importan este módulo directo.
 */
export const systemFeedback = {
  offline: {
    tone: "warning" as ToastTone,
    title: "Sin conexión",
    description: "Lo que agregues se guardará en tu cotización.",
  },
  online: { tone: "success" as ToastTone, title: "Conexión recuperada" },
  genericError: {
    title: "Algo salió mal de nuestro lado",
    body: "Ya quedó registrado. Inténtalo de nuevo en un momento o escríbenos por WhatsApp.",
    /** Mientras no haya número de WhatsApp (ajuste whatsapp_number), sin prometerlo. */
    bodyNoWhatsapp: "Ya quedó registrado. Inténtalo de nuevo en un momento o llámanos.",
    primary: "Intentar de nuevo",
    /** Enlaces de contacto de la pantalla de error (BD-046); WhatsApp solo si hay número. */
    whatsapp: "Escríbenos por WhatsApp",
    call: (phone: string) => `Llámanos al ${phone}`,
    /** Se muestra para que el visitante lo comparta con Ventas y se busque en el log. */
    reference: (code: string) => `Código de referencia: ${code}`,
  },
};
