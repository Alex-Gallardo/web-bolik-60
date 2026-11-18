import "server-only";
import { customerTypeLabels, quoteMail } from "@/content/mail";
import type { CustomerType } from "@/lib/constants";
import { formatPhone } from "@/lib/format";
import type { QuoteItemDraft } from "@/server/data/quote-requests";
import type { MailMessage } from "./transport";

/**
 * Los dos correos de una cotización (BD-074, doc 17 §8): el interno a Ventas y el acuse al cliente.
 * Funciones puras: reciben los datos y devuelven asunto, HTML y texto. HTML sencillo para Outlook
 * (tablas y estilos en línea, sin imágenes externas ni CSS en <head>). Todo lo que escribió el
 * visitante se escapa: nunca se interpreta como HTML.
 */

export type QuoteMailData = {
  quoteId: number;
  folio: string;
  customerType: CustomerType;
  organization?: string;
  name: string;
  /** 8 dígitos ("55551234"). */
  phone?: string;
  email?: string;
  departmentName: string;
  municipality?: string;
  notes?: string;
  items: Pick<
    QuoteItemDraft,
    "productName" | "colorName" | "sku" | "packagingName" | "quantity" | "unitLabel"
  >[];
  createdAt: Date;
};

/**
 * Colores de tokens.css (docs/02): los clientes de correo no entienden variables de CSS, así que van
 * los valores. Si cambia la paleta, cambiarlos aquí también.
 */
const C = {
  blue: "#1d3fce", // check-colors-ignore
  ink: "#111318", // check-colors-ignore
  muted: "#4b5368", // check-colors-ignore
  line: "#e3e7f0", // check-colors-ignore
  soft: "#f4f6fb", // check-colors-ignore
  paper: "#ffffff", // check-colors-ignore
} as const;

const FONT = "font-family:Segoe UI,Arial,sans-serif;";

/** «visita x.com», «http://…», «www.…»: no va en el saludo del acuse. */
export const looksLikeLink = (value: string) =>
  /https?:|www\.|[a-z0-9-]+\.(com|net|org|info|xyz|ru|io|me|gt|co|biz|online|site|link|top)\b/i.test(
    value,
  );

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Texto del visitante en HTML: escapado y con sus saltos de línea. */
const html = (value: string) => escapeHtml(value).replace(/\r?\n/g, "<br>");

const dateGt = (date: Date) =>
  new Intl.DateTimeFormat("es-GT", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "America/Guatemala",
  }).format(date);

const t = quoteMail;

function linesTable(items: QuoteMailData["items"]): string {
  const th = `style="${FONT}text-align:left;padding:8px;border-bottom:2px solid ${C.line};color:${C.muted};font-size:13px"`;
  const td = `style="${FONT}padding:8px;border-bottom:1px solid ${C.line};font-size:14px;color:${C.ink}"`;
  const rows = items
    .map(
      (i) =>
        `<tr><td ${td}>${html(i.productName)}</td><td ${td}>${html(i.colorName)}</td><td ${td}>${html(i.sku)}</td><td ${td}>${html(i.packagingName ?? t.empty)}</td><td ${td}><strong>${i.quantity.toLocaleString("es-GT")}</strong> ${html(i.unitLabel)}</td></tr>`,
    )
    .join("");
  return `<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse"><tr><th scope="col" ${th}>${t.table.product}</th><th scope="col" ${th}>${t.table.color}</th><th scope="col" ${th}>${t.table.code}</th><th scope="col" ${th}>${t.table.packaging}</th><th scope="col" ${th}>${t.table.quantity}</th></tr>${rows}</table>`;
}

function linesText(items: QuoteMailData["items"]): string {
  return items
    .map(
      (i) =>
        `- ${i.productName} ${i.colorName} (${i.sku})${i.packagingName ? `, ${i.packagingName}` : ""}: ${i.quantity.toLocaleString("es-GT")} ${i.unitLabel}`,
    )
    .join("\n");
}

/** Marco común: una columna de 600 px centrada, fondo suave y franja azul de marca. */
function frame(content: string, title: string): string {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(title)}</title></head><body style="margin:0;padding:0;background:${C.soft}" bgcolor="${C.soft}"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${C.soft}" style="background:${C.soft}"><tr><td align="center" style="padding:24px 12px"><table role="presentation" width="600" cellpadding="0" cellspacing="0" bgcolor="${C.paper}" style="max-width:600px;width:100%;background:${C.paper};border:1px solid ${C.line}"><tr><td bgcolor="${C.blue}" style="background:${C.blue};padding:16px 24px;${FONT}font-size:20px;font-weight:bold;color:${C.paper}">BOLIK</td></tr><tr><td style="padding:24px;${FONT}font-size:15px;line-height:1.5;color:${C.ink}">${content}</td></tr></table></td></tr></table></body></html>`;
}

const p = (content: string, style = "") => `<p style="margin:0 0 16px;${style}">${content}</p>`;
const h2 = (content: string) =>
  `<h2 style="${FONT}font-size:17px;margin:24px 0 8px;color:${C.ink}">${content}</h2>`;

/** Correo interno a Ventas: datos del cliente, líneas, notas, origen y botón al admin. */
export function salesQuoteEmail(
  data: QuoteMailData,
  { to, adminUrl }: { to: string; adminUrl: string },
): MailMessage {
  const f = t.sales.fields;
  const type = customerTypeLabels[data.customerType];
  const phone = data.phone ? formatPhone(data.phone) : undefined;
  const fields: [string, string | undefined][] = [
    [f.name, data.name],
    [f.organization, data.organization],
    [f.customerType, type],
    [f.phone, phone],
    [f.email, data.email],
    [f.department, data.departmentName],
    [f.municipality, data.municipality],
  ];
  const cell = `style="${FONT}padding:4px 12px 4px 0;font-size:14px;vertical-align:top"`;
  const fieldRows = fields
    .map(
      ([label, value]) =>
        `<tr><td ${cell}><span style="color:${C.muted}">${label}</span></td><td ${cell}>${value ? html(value) : t.empty}</td></tr>`,
    )
    .join("");
  // Botón «a prueba de Outlook»: el color va en la celda (Outlook ignora padding y fondo de un <a>).
  const button = `<table role="presentation" cellpadding="0" cellspacing="0"><tr><td bgcolor="${C.blue}" style="background:${C.blue};border-radius:6px"><a href="${escapeHtml(adminUrl)}" style="display:inline-block;padding:12px 24px;${FONT}font-weight:bold;color:${C.paper};text-decoration:none">${t.sales.adminButton}</a></td></tr></table>`;

  const htmlBody = frame(
    [
      `<h1 style="${FONT}font-size:22px;margin:0 0 4px;color:${C.ink}">${escapeHtml(t.sales.heading(data.folio))}</h1>`,
      p(escapeHtml(t.sales.received(dateGt(data.createdAt))), `color:${C.muted}`),
      h2(t.sales.customerTitle),
      `<table role="presentation" cellpadding="0" cellspacing="0">${fieldRows}</table>`,
      h2(t.sales.linesTitle),
      linesTable(data.items),
      data.notes ? h2(t.sales.notesTitle) + p(html(data.notes)) : "",
      h2(t.sales.originTitle),
      p(t.sales.originEmpty, `color:${C.muted}`),
      `<div style="margin:24px 0 0">${button}</div>`,
      `<p style="margin:24px 0 0;font-size:12px;color:${C.muted}">${t.sales.footer}</p>`,
    ].join(""),
    t.sales.subject(data.folio, type, data.departmentName),
  );

  const text = [
    t.sales.heading(data.folio),
    t.sales.received(dateGt(data.createdAt)),
    "",
    `${t.sales.customerTitle}:`,
    ...fields.map(([label, value]) => `${label}: ${value ?? t.empty}`),
    "",
    `${t.sales.linesTitle}:`,
    linesText(data.items),
    ...(data.notes ? ["", `${t.sales.notesTitle}:`, data.notes] : []),
    "",
    `${t.sales.originTitle}: ${t.sales.originEmpty}`,
    "",
    `${t.sales.adminButton}: ${adminUrl}`,
  ].join("\n");

  return {
    to,
    subject: t.sales.subject(data.folio, type, data.departmentName),
    html: htmlBody,
    text,
    // Responder le escribe al cliente (si dejó correo).
    replyTo: data.email,
  };
}

/**
 * Acuse al cliente (doc 17 §8). null si no dejó correo. Sin nada interno: ni enlace al admin, ni
 * estado de SAP, ni origen, ni datos de otras personas.
 */
export function customerQuoteAck(
  data: QuoteMailData,
  { whatsappNumber }: { whatsappNumber: string | null },
): MailMessage | null {
  if (!data.email) return null;
  const whatsapp = whatsappNumber ? t.ack.whatsapp(formatPhone(whatsappNumber)) : null;
  // Un «nombre» con forma de enlace convertiría el acuse en publicidad o phishing: sin nombre.
  const greeting = looksLikeLink(data.name) ? t.ack.greetingNoName : t.ack.greeting(data.name);
  const htmlBody = frame(
    [
      p(escapeHtml(greeting)),
      p(
        escapeHtml(t.ack.received(data.folio)).replace(
          escapeHtml(data.folio),
          `<strong>${escapeHtml(data.folio)}</strong>`,
        ),
      ),
      p(t.ack.linesIntro),
      linesTable(data.items),
      whatsapp ? p(escapeHtml(whatsapp), "margin-top:24px") : "",
      p(t.ack.closing, whatsapp ? "" : "margin-top:24px"),
    ].join(""),
    t.ack.subject(data.folio),
  );
  const text = [
    greeting,
    "",
    t.ack.received(data.folio),
    "",
    t.ack.linesIntro,
    linesText(data.items),
    ...(whatsapp ? ["", whatsapp] : []),
    "",
    t.ack.closing,
  ].join("\n");
  return { to: data.email, subject: t.ack.subject(data.folio), html: htmlBody, text };
}
