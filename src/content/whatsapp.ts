/**
 * Mensajes prellenados de WhatsApp (BD-067, docs/07 §3 «WhatsApp con contexto»): llevan lo que
 * Ventas necesita para no volver a preguntar (producto, código, presentación y cantidad, o el folio).
 * Nunca datos personales del visitante. Los arma lib/whatsapp.ts.
 */
export const whatsappText = {
  greeting: "Hola, Bolik.",
  /** Mensaje general (botón flotante, menú, cierre de la home). */
  general: "Hola, Bolik. Quiero información sobre sus productos y precios por mayor.",
  /** «Me interesa Bolik Ultra Azul (PT00058), cajilla de 12 × 20.» */
  interested: "Me interesa",
  quoteIntro: "Quiero cotizar:",
  question: "¿Me pueden dar precio y disponibilidad?",
  /** Cantidad sin presentación: «20 unidades». */
  units: (quantity: string) => `${quantity} ${quantity === "1" ? "unidad" : "unidades"}`,
  /** Más líneas de las que caben en el mensaje: «y 3 productos más». */
  more: (n: number) => `y ${n} ${n === 1 ? "producto más" : "productos más"}`,
  /** Después de enviar la cotización (BD-073). */
  sent: (folio: string) => `Envié la cotización ${folio}. ¿Me pueden ayudar con el seguimiento?`,
} as const;
