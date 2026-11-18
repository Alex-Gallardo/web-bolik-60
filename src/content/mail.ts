import type { CustomerType } from "@/lib/constants";
import { quotePage } from "./quote";

/**
 * Textos de los correos de cotización (BD-074, doc 17 §8). Solo servidor: los arma
 * server/mail/quote-emails.ts.
 */

/**
 * Nombre visible de cada tipo de cliente: los del formulario (content/quote.ts, una sola fuente) y
 * los que la base admite aunque el formulario no los ofrezca.
 */
export const customerTypeLabels: Record<CustomerType, string> = {
  ...(Object.fromEntries(quotePage.form.customerOptions.map((o) => [o.value, o.label])) as Record<
    (typeof quotePage.form.customerOptions)[number]["value"],
    string
  >),
  distribuidor: "Distribuidor",
  universidad: "Universidad",
};

export const quoteMail = {
  /** Interno, a Ventas. */
  sales: {
    subject: (folio: string, customerType: string, department: string) =>
      `Nueva cotización ${folio} · ${customerType} · ${department}`,
    heading: (folio: string) => `Nueva cotización ${folio}`,
    received: (date: string) => `Recibida el ${date} desde bolik66.com.`,
    customerTitle: "Datos del cliente",
    fields: {
      name: "Nombre",
      organization: "Institución",
      customerType: "Tipo de cliente",
      phone: "Teléfono",
      email: "Correo",
      department: "Departamento",
      municipality: "Municipio",
    },
    linesTitle: "Productos",
    notesTitle: "Notas del cliente",
    originTitle: "Origen",
    /** UTM y página de llegada: el sitio todavía no los captura (BD-127). */
    originEmpty: "Sin datos de campaña",
    adminButton: "Abrir en el admin",
    /** Pie: de dónde sale y que se responde directo al cliente. */
    footer: "Correo automático de bolik66.com. Responder este correo le escribe al cliente.",
  },
  /** Acuse, al cliente (doc 17 §8). */
  ack: {
    subject: (folio: string) => `Recibimos tu cotización ${folio}`,
    greeting: (name: string) => `Hola, ${name}:`,
    /** Si el nombre parece un enlace (abuso del acuse), sin nombre. */
    greetingNoName: "Hola:",
    received: (folio: string) =>
      `Recibimos tu solicitud de cotización ${folio}. Un ejecutivo de ventas te contactará en un día hábil con precios y disponibilidad.`,
    linesIntro: "Esto es lo que pediste:",
    whatsapp: (phone: string) =>
      `¿Necesitas algo antes? Escríbenos por WhatsApp al ${phone} y menciona tu folio.`,
    closing: "Gracias por preferir Bolik, hecho en Guatemala desde 1966.",
  },
  /** Encabezados de la tabla de líneas (los dos correos). */
  table: {
    product: "Producto",
    color: "Color",
    code: "Código",
    packaging: "Presentación",
    quantity: "Cantidad",
  },
  /** Celda sin dato. */
  empty: "—",
} as const;
