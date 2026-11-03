import { toInternationalPhone } from "./format";

/**
 * Enlace de WhatsApp con mensaje prellenado. El número viene de SiteSetting (nunca escrito en el
 * código); las plantillas por contexto (producto, cotización) llegan con BD-067.
 * Devuelve null si el número no es un teléfono guatemalteco válido, para no mostrar un botón roto.
 */
export function whatsappUrl(phone: string, message?: string): string | null {
  const number = toInternationalPhone(phone);
  if (!number) return null;
  // toWellFormed: un emoji cortado al truncar el mensaje haría lanzar a encodeURIComponent.
  const text = message?.trim().toWellFormed();
  return text
    ? `https://wa.me/${number}?text=${encodeURIComponent(text)}`
    : `https://wa.me/${number}`;
}
