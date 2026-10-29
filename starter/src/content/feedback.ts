/**
 * Mensajes de feedback de Bolik Digital.
 * Regla: ningún componente escribe textos de toast o diálogo sueltos; todos salen de aquí.
 * Tono: tú, cálido, directo. Qué pasó + qué sigue. Errores con salida (WhatsApp/teléfono).
 */

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
    limit: { tone: "warning" as ToastTone, title: "Para pedidos de más de 50 productos, escríbenos por WhatsApp" },
  },
  forms: {
    invalid: { tone: "warning" as ToastTone, title: "Revisa los campos marcados" },
    tooFast: { tone: "warning" as ToastTone, title: "Dale un momento más antes de enviar" },
    rateLimited: {
      title: "Recibimos varias solicitudes seguidas",
      body: "Espera unos minutos e inténtalo de nuevo. Si es urgente, escríbenos por WhatsApp.",
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
    contactSent: { title: "Mensaje enviado", body: "Te responderemos en horario de oficina, de lunes a viernes.", primary: "Listo" },
  },
  whatsapp: {
    opened: { tone: "info" as ToastTone, title: "Abrimos WhatsApp con tu mensaje listo" },
    copied: { tone: "success" as ToastTone, title: "Mensaje copiado" },
    copyFailed: { tone: "warning" as ToastTone, title: "Selecciona el mensaje y cópialo manualmente" },
  },
  catalog: {
    colorChanged: (color: string, sku: string) => ({ tone: "info" as ToastTone, title: `Color ${color} · ${sku}` }),
    noResults: (q: string) => ({
      title: `No encontramos «${q}»`,
      body: "Prueba con otra palabra, con el código del producto (por ejemplo PT00058) o revisa todo el catálogo.",
    }),
    filtersEmpty: { title: "No hay productos con esos filtros", action: "Quitar filtros" },
    pdfReady: { tone: "success" as ToastTone, title: "Descargando la ficha técnica" },
  },
  stores: {
    locating: { tone: "info" as ToastTone, title: "Buscando tiendas cerca de ti…" },
    located: (n: number) => ({ tone: "success" as ToastTone, title: `Encontramos ${n} tiendas cerca` }),
    locationDenied: {
      tone: "info" as ToastTone,
      title: "No pasa nada",
      description: "Elige tu departamento en la lista para ver las tiendas.",
    },
    noneInDepartment: (dep: string) => ({
      title: `Aún no tenemos tiendas registradas en ${dep}`,
      body: "Escríbenos y te decimos dónde conseguir Bolik, o conviértete en distribuidor.",
    }),
  },
  system: {
    offline: { tone: "warning" as ToastTone, title: "Sin conexión", description: "Lo que agregues se guardará en tu cotización." },
    online: { tone: "success" as ToastTone, title: "Conexión recuperada" },
    genericError: {
      title: "Algo salió mal de nuestro lado",
      body: "Ya quedó registrado. Inténtalo de nuevo en un momento o escríbenos por WhatsApp.",
      primary: "Intentar de nuevo",
    },
  },
  admin: {
    saved: { tone: "success" as ToastTone, title: "Cambios guardados y publicados", action: "Ver en el sitio" },
    draftSaved: { tone: "success" as ToastTone, title: "Borrador guardado" },
    deleted: (what: string) => ({ tone: "info" as ToastTone, title: `${what} eliminado`, action: "Deshacer" }),
    confirmDelete: (what: string) => ({
      title: `¿Eliminar ${what}?`,
      body: "Esta acción no se puede deshacer.",
      primary: "Sí, eliminar",
      secondary: "Cancelar",
    }),
    uploadOk: { tone: "success" as ToastTone, title: "Imagen lista", description: "Generamos todas las versiones optimizadas." },
    uploadTooBig: { tone: "error" as ToastTone, title: "La imagen pesa más de 10 MB", description: "Exporta una versión más liviana e inténtalo de nuevo." },
    altMissing: { tone: "warning" as ToastTone, title: "Falta el texto alternativo", description: "Describe la imagen en pocas palabras; ayuda al SEO y a la accesibilidad." },
    syncStarted: { tone: "info" as ToastTone, title: "Sincronizando con SAP…" },
    syncDone: (u: number, c: number) => ({ tone: "success" as ToastTone, title: `Sincronización lista: ${u} actualizados, ${c} nuevos` }),
    erpRetryOk: { tone: "success" as ToastTone, title: "Cotización enviada a SAP" },
    erpRetryFail: { tone: "error" as ToastTone, title: "SAP no respondió", description: "Lo intentaremos de nuevo automáticamente en 30 minutos." },
    loginLocked: { title: "Cuenta bloqueada por 15 minutos", body: "Hubo 5 intentos fallidos. Si olvidaste tu contraseña, pide a un administrador que la restablezca." },
    sessionExpired: { tone: "warning" as ToastTone, title: "Tu sesión terminó", description: "Vuelve a iniciar sesión; tus cambios sin guardar siguen en el formulario." },
  },
} as const;
