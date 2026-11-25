import "server-only";
import { customerTypeLabels, quoteMail } from "@/content/mail";
import type { CustomerType } from "@/lib/constants";
import { formatPhone } from "@/lib/format";
import type { QuoteItemDraft } from "@/server/data/quote-requests";
import { C, FONT, dateGt, escapeHtml, frame, h2, html, looksLikeLink, p } from "./layout";
import type { MailMessage } from "./transport";

// Antes vivían aquí (BD-074); siguen exportados para quien ya los importaba.
export { escapeHtml, looksLikeLink } from "./layout";

/**
 * Los dos correos de una cotización (BD-074, doc 17 §8): el interno a Ventas y el acuse al cliente.
 * Funciones puras: reciben los datos y devuelven asunto, HTML y texto, con las piezas de
 * layout.ts (HTML para Outlook; lo del visitante, escapado).
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
