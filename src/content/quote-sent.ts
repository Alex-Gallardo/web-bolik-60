/**
 * Confirmación /cotizacion/enviada/[folio] (BD-075, docs/06 §3.17, doc 17 §`/cotizacion/enviada`).
 * `other*`: el folio no es de este navegador (otro equipo o inventado): sin datos (texto aprobado
 * por el usuario, 24 nov 2026). Aparte de quote.ts: ese lo importa la isla de /cotizacion y estos
 * textos solo los usa el servidor.
 */
export const quoteSentPage = {
  /** Del acuse al cliente (doc 17, correos). */
  metaDescription:
    "Recibimos tu solicitud de cotización. Un ejecutivo de ventas te contactará en un día hábil con precios y disponibilidad.",
  /** Última miga: «Inicio › Mi cotización › Enviada» (nota de BD-093). */
  crumb: "Enviada",
  title: "¡Recibimos tu cotización!",
  folioIntro: "Tu número de seguimiento es",
  /** Después del folio. Sin departamento (ya no existe), «de ventas» como el diálogo. */
  nextStep: (department: string | null) =>
    `Un ejecutivo de ${department ?? "ventas"} te contactará en un día hábil.`,
  itemsTitle: "Productos de tu cotización",
  whatsapp: "Escribir por WhatsApp con mi folio",
  keepBrowsing: { label: "Seguir viendo productos", href: "/productos" },
  otherTitle: "Consulta tu cotización",
  otherBody: "Por seguridad, el resumen solo se ve en el navegador desde donde la enviaste.",
  otherWhatsApp: "Si necesitas ayuda con tu folio, escríbenos por WhatsApp.",
} as const;
