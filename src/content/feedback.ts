/**
 * Mensajes de feedback de Bolik Digital.
 * Regla: ningún componente escribe textos de toast o diálogo sueltos; todos salen de aquí.
 * Tono: tú, cálido, directo. Qué pasó + qué sigue. Errores con salida (WhatsApp/teléfono).
 */

import { systemFeedback } from "./feedback-system";

export type ToastTone = "success" | "info" | "warning" | "error";

export const feedback = {
  quote: {
    added: (name: string, qty: number, unit: string) => ({
      tone: "success" as ToastTone,
      title: "Agregado a tu cotización",
      description: `${qty} ${unit} de ${name}`,
      action: "Ver cotización",
    }),
    updated: { tone: "info" as ToastTone, title: "Cantidad actualizada" },
    removed: (name: string) => ({
      tone: "info" as ToastTone,
      title: `Quitamos ${name}`,
      action: "Deshacer",
    }),
    cleared: { tone: "info" as ToastTone, title: "Tu cotización quedó vacía", action: "Deshacer" },
    sending: { title: "Enviando tu cotización…" },
    sent: (folio: string) => ({
      title: "¡Listo! Recibimos tu cotización",
      body: `Tu número de seguimiento es ${folio}. Un ejecutivo de ventas te contactará en un día hábil con precios y disponibilidad.`,
      primary: "Ver resumen",
      secondary: "Seguir viendo productos",
    }),
    failed: {
      title: "No pudimos enviar tu cotización",
      body: "Tus productos siguen guardados. Revisa tu conexión e inténtalo de nuevo, o envíanosla por WhatsApp.",
      primary: "Intentar de nuevo",
      secondary: "Enviar por WhatsApp",
    },
    empty: {
      title: "Tu cotización está vacía",
      body: "Agrega productos desde el catálogo o elige un kit escolar.",
    },
    /** Al enviar, algún producto ya no se puede cotizar (se despublicó o cambió su presentación). */
    /** `names`: los productos ya unidos («Bolik Ultra (Azul · PT00058), …»). */
    staleItems: (names: string) => ({
      title: "Algunos productos ya no están disponibles",
      body: `Quita de tu cotización: ${names}. Después vuelve a enviarla; si los necesitas, escríbenos por WhatsApp.`,
      primary: "Entendido",
    }),
    limit: {
      tone: "warning" as ToastTone,
      title: "Para pedidos de más de 50 productos, escríbenos por WhatsApp",
    },
  },
  forms: {
    invalid: { tone: "warning" as ToastTone, title: "Revisa los campos marcados" },
    /** Mensajes de error de campo (doc 17 §5): los usan los esquemas de lib/form-schemas.ts. */
    errors: {
      required: "Este dato es necesario",
      phone: "Escribe un teléfono de 8 dígitos, por ejemplo 5555 1234",
      email: "Revisa tu correo, por ejemplo nombre@correo.com",
      phoneOrEmail: "Déjanos al menos un teléfono o un correo",
      qtyMin: "La cantidad mínima es 1",
      qtyMax: "Para más de 9,999, escríbenos por WhatsApp",
      nit: 'Escribe tu NIT o "CF"',
      count: (max: number) => `Escribe un número entre 1 y ${max.toLocaleString("es-GT")}`,
      tooLong: (max: number) => `Usa como máximo ${max.toLocaleString("es-GT")} caracteres`,
    },
    tooFast: { tone: "warning" as ToastTone, title: "Dale un momento más antes de enviar" },
    rateLimited: {
      title: "Recibimos varias solicitudes seguidas",
      body: "Espera unos minutos e inténtalo de nuevo. Si es urgente, escríbenos por WhatsApp.",
      /** Sin número de WhatsApp en los ajustes: sin prometerlo. */
      bodyNoWhatsapp: "Espera unos minutos e inténtalo de nuevo. Si es urgente, llámanos.",
      primary: "Escribir por WhatsApp",
      secondary: "Entendido",
    },
    schoolSent: (folio: string, school: string) => ({
      title: `¡Qué emoción, ${school}!`,
      body: `Recibimos tu solicitud (${folio}). Te llamaremos en los próximos 3 días hábiles para agendar la visita.`,
      primary: "Listo",
    }),
    distributorSent: (folio: string) => ({
      title: "Gracias por tu interés en vender Bolik",
      body: `Tu solicitud ${folio} está en revisión. Te responderemos en un máximo de 5 días hábiles.`,
      primary: "Listo",
    }),
    contactSent: {
      title: "Mensaje enviado",
      body: "Te responderemos en horario de oficina, de lunes a viernes.",
      primary: "Listo",
    },
    /** Solicitud de escuela o distribuidor que no se pudo enviar (BD-076, doc 17 §5). */
    failed: {
      title: "No pudimos enviar tu solicitud",
      body: "Revisa tu conexión e inténtalo de nuevo, o escríbenos por WhatsApp.",
      /** Sin número de WhatsApp en los ajustes: sin prometerlo. */
      bodyNoWhatsapp: "Revisa tu conexión e inténtalo de nuevo.",
      primary: "Intentar de nuevo",
      secondary: "Escribir por WhatsApp",
    },
    /** El mensaje de contacto que no se pudo enviar (BD-076). */
    contactFailed: {
      title: "No pudimos enviar tu mensaje",
      body: "Revisa tu conexión e inténtalo de nuevo, o escríbenos por WhatsApp.",
      bodyNoWhatsapp: "Revisa tu conexión e inténtalo de nuevo.",
      primary: "Intentar de nuevo",
      secondary: "Escribir por WhatsApp",
    },
  },
  whatsapp: {
    opened: { tone: "info" as ToastTone, title: "Abrimos WhatsApp con tu mensaje listo" },
    copied: { tone: "success" as ToastTone, title: "Mensaje copiado" },
    copyFailed: {
      tone: "warning" as ToastTone,
      title: "Selecciona el mensaje y cópialo manualmente",
    },
  },
  catalog: {
    colorChanged: (color: string, sku: string) => ({
      tone: "info" as ToastTone,
      title: `Color ${color} · ${sku}`,
    }),
    noResults: (q: string) => ({
      title: `No encontramos «${q}»`,
      body: "Prueba con otra palabra, con el código del producto (por ejemplo PT00058) o revisa todo el catálogo.",
    }),
    filtersEmpty: { title: "No hay productos con esos filtros", action: "Quitar filtros" },
    pdfReady: { tone: "success" as ToastTone, title: "Descargando la ficha técnica" },
  },
  /** Buscador (BD-066): si no se pudo descargar el motor o el índice. */
  search: {
    loadFailed: "No pudimos cargar el buscador. Toca «Buscar» para ver los resultados.",
  },
  stores: {
    locating: { tone: "info" as ToastTone, title: "Buscando tiendas cerca de ti…" },
    located: (n: number) => ({
      tone: "success" as ToastTone,
      title: `Encontramos ${n} ${n === 1 ? "tienda" : "tiendas"} cerca`,
    }),
    /** BD-081: el mapa (o su hoja en móvil) no se pudo descargar; la lista sigue. */
    mapFailed: {
      tone: "error" as ToastTone,
      title: "No pudimos cargar el mapa. La lista de tiendas sigue disponible.",
    },
    /** BD-081: el departamento con tiendas más cercano queda a más de 150 km. */
    noneNearby: {
      tone: "info" as ToastTone,
      title: "No encontramos tiendas cerca de ti",
      description: "Elige tu departamento en la lista para ver las tiendas.",
    },
    locationDenied: {
      tone: "info" as ToastTone,
      title: "No pasa nada",
      description: "Elige tu departamento en la lista para ver las tiendas.",
    },
    /** /donde-comprar (BD-080): búsqueda por nombre o departamento sin tiendas (doc 17 §4). */
    filtersEmpty: {
      title:
        "No encontramos tiendas con ese nombre. Prueba con otro o elige «Todos los departamentos».",
      action: "Quitar filtros",
    },
    noneInDepartment: (dep: string) => ({
      title: `Aún no tenemos tiendas registradas en ${dep}`,
      body: "Escríbenos y te decimos dónde conseguir Bolik, o conviértete en distribuidor.",
    }),
  },
  system: systemFeedback,
  admin: {
    saved: {
      tone: "success" as ToastTone,
      title: "Cambios guardados y publicados",
      action: "Ver en el sitio",
    },
    draftSaved: { tone: "success" as ToastTone, title: "Borrador guardado" },
    deleted: (what: string) => ({
      tone: "info" as ToastTone,
      title: `${what} eliminado`,
      action: "Deshacer",
    }),
    confirmDelete: (what: string) => ({
      title: `¿Eliminar ${what}?`,
      body: "Esta acción no se puede deshacer.",
      primary: "Sí, eliminar",
      secondary: "Cancelar",
    }),
    uploadOk: {
      tone: "success" as ToastTone,
      title: "Imagen lista",
      description: "Generamos todas las versiones optimizadas.",
    },
    uploadTooBig: {
      tone: "error" as ToastTone,
      title: "La imagen pesa más de 10 MB",
      description: "Exporta una versión más liviana e inténtalo de nuevo.",
    },
    altMissing: {
      tone: "warning" as ToastTone,
      title: "Falta el texto alternativo",
      description: "Describe la imagen en pocas palabras; ayuda al SEO y a la accesibilidad.",
    },
    syncStarted: { tone: "info" as ToastTone, title: "Sincronizando con SAP…" },
    syncDone: (u: number, c: number) => ({
      tone: "success" as ToastTone,
      title: `Sincronización lista: ${u} actualizados, ${c} nuevos`,
    }),
    erpRetryOk: { tone: "success" as ToastTone, title: "Cotización enviada a SAP" },
    erpRetryFail: {
      tone: "error" as ToastTone,
      title: "SAP no respondió",
      description: "Lo intentaremos de nuevo automáticamente en 30 minutos.",
    },
    /** Login (BD-114): el mismo mensaje para un correo que no existe y una contraseña errónea. */
    loginInvalid: { title: "El correo o la contraseña no coinciden" },
    /** Sin base de datos (DATA_SOURCE=fixtures) o la base no respondió. */
    loginUnavailable: {
      title: "El panel no está disponible en este momento",
      body: "Inténtalo más tarde.",
    },
    forbidden: { tone: "warning" as ToastTone, title: "No tienes permiso para esa sección" },
    loggedOut: { tone: "success" as ToastTone, title: "Cerraste sesión" },
    /**
     * Cuenta bloqueada (5 intentos) o 10 intentos fallidos desde la misma IP (BD-077): el mismo
     * aviso para los dos, sin decir cuál fue. 15 minutos es la espera máxima en ambos.
     */
    loginLocked: {
      title: "Demasiados intentos fallidos",
      body: "Por seguridad, espera 15 minutos antes de volver a intentarlo. Si olvidaste tu contraseña, pide a un administrador que la restablezca.",
    },
    sessionExpired: {
      tone: "warning" as ToastTone,
      title: "Tu sesión terminó",
      description: "Vuelve a iniciar sesión; tus cambios sin guardar siguen en el formulario.",
    },
  },
} as const;
