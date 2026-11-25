import "server-only";
import {
  businessTypeOptions,
  contactSubjectOptions,
  monthOptions,
  optionLabel,
  schoolLevelOptions,
} from "@/content/forms";
import { requestMail as t } from "@/content/mail";
import type { ContactRequest } from "@/features/contact/schema";
import type { DistributorRequest } from "@/features/distributors/schema";
import type { SchoolVisit } from "@/features/schools/schema";
import { formatNumber, formatPhone } from "@/lib/format";
import {
  C,
  boldFolio,
  dateGt,
  escapeHtml,
  fieldsTable,
  footnote,
  frame,
  h1,
  h2,
  html,
  looksLikeLink,
  mailButton,
  p,
  type MailField,
} from "./layout";
import type { MailMessage } from "./transport";

/**
 * Correos de las solicitudes de escuelas, distribuidores y contacto (BD-076, doc 17 §8): el interno
 * a la bandeja de cada uno y, en escuelas y distribuidores, el acuse al visitante. Funciones puras,
 * con el mismo marco que los de la cotización (layout.ts).
 */

/** Lo que llega a cada correo: lo validado más lo que pone el servidor. */
type Meta = { id: number; createdAt: Date };
export type SchoolMailData = SchoolVisit & Meta & { folio: string; departmentName: string };
export type DistributorMailData = DistributorRequest &
  Meta & { folio: string; departmentName: string };
export type ContactMailData = ContactRequest & Meta;

type Internal = {
  to: string;
  subject: string;
  heading: string;
  fields: MailField[];
  message?: string;
  messageTitle?: string;
  adminUrl: string;
  createdAt: Date;
  replyTo?: string;
};

/** Interno: encabezado, datos, mensaje (si hay) y botón al admin. */
function internalEmail(mail: Internal): MailMessage {
  const htmlBody = frame(
    [
      h1(escapeHtml(mail.heading)),
      p(escapeHtml(t.received(dateGt(mail.createdAt))), `color:${C.muted}`),
      h2(t.fieldsTitle),
      fieldsTable(mail.fields, t.empty),
      mail.message ? h2(mail.messageTitle ?? "") + p(html(mail.message)) : "",
      `<div style="margin:24px 0 0">${mailButton(mail.adminUrl, t.adminButton)}</div>`,
      // Sin correo del visitante, responder no le llegaría: el pie no lo promete.
      footnote(mail.replyTo ? `${t.footer} ${t.footerReply}` : t.footer),
    ].join(""),
    mail.subject,
  );
  const text = [
    mail.heading,
    t.received(dateGt(mail.createdAt)),
    "",
    `${t.fieldsTitle}:`,
    ...mail.fields.map(([label, value]) => `${label}: ${value ?? t.empty}`),
    ...(mail.message ? ["", `${mail.messageTitle}:`, mail.message] : []),
    "",
    `${t.adminButton}: ${mail.adminUrl}`,
  ].join("\n");
  return { to: mail.to, subject: mail.subject, html: htmlBody, text, replyTo: mail.replyTo };
}

/**
 * Acuse: saludo, qué recibimos con el folio, WhatsApp y cierre. Sin nada interno. null sin correo.
 */
function ackEmail({
  to,
  name,
  subject,
  received,
  folio,
  whatsappNumber,
}: {
  to: string | undefined;
  name: string;
  subject: string;
  received: string;
  folio: string;
  whatsappNumber: string | null;
}): MailMessage | null {
  if (!to) return null;
  const whatsapp = whatsappNumber ? t.whatsapp(formatPhone(whatsappNumber)) : null;
  // Un «nombre» con forma de enlace convertiría el acuse en publicidad o phishing: sin nombre.
  const greeting = looksLikeLink(name) ? t.greetingNoName : t.greeting(name);
  const htmlBody = frame(
    [
      p(escapeHtml(greeting)),
      p(boldFolio(received, folio)),
      whatsapp ? p(escapeHtml(whatsapp), "margin-top:24px") : "",
      p(t.closing, whatsapp ? "" : "margin-top:24px"),
    ].join(""),
    subject,
  );
  const text = [greeting, "", received, ...(whatsapp ? ["", whatsapp] : []), "", t.closing].join(
    "\n",
  );
  return { to, subject, html: htmlBody, text };
}

const phoneOf = (phone: string | undefined) => (phone ? formatPhone(phone) : undefined);

/** Solicitud de visita, a la bandeja de escuelas. */
export function schoolSalesEmail(
  data: SchoolMailData,
  { to, adminUrl }: { to: string; adminUrl: string },
): MailMessage {
  const f = t.school.fields;
  return internalEmail({
    to,
    subject: t.school.subject(data.folio, data.schoolName, data.departmentName),
    heading: t.school.heading(data.folio),
    fields: [
      [f.schoolName, data.schoolName],
      [f.level, optionLabel(schoolLevelOptions, data.level)],
      [f.students, data.students ? formatNumber(data.students) : undefined],
      [f.department, data.departmentName],
      [f.municipality, data.municipality],
      [f.name, data.name],
      [f.phone, phoneOf(data.phone)],
      [f.email, data.email],
      [f.preferredMonth, data.preferredMonth && optionLabel(monthOptions, data.preferredMonth)],
    ],
    adminUrl,
    createdAt: data.createdAt,
    replyTo: data.email,
  });
}

export function schoolAck(
  data: SchoolMailData,
  { whatsappNumber }: { whatsappNumber: string | null },
): MailMessage | null {
  // Un colegio con forma de enlace tampoco va en el texto del acuse.
  const school = looksLikeLink(data.schoolName) ? t.school.ackSchoolFallback : data.schoolName;
  return ackEmail({
    to: data.email,
    name: data.name,
    subject: t.school.ackSubject(data.folio),
    received: t.school.ackReceived(data.folio, school),
    folio: data.folio,
    whatsappNumber,
  });
}

/** Solicitud de distribuidor, a la bandeja de distribuidores. */
export function distributorSalesEmail(
  data: DistributorMailData,
  { to, adminUrl }: { to: string; adminUrl: string },
): MailMessage {
  const f = t.distributor.fields;
  const type = optionLabel(businessTypeOptions, data.businessType);
  return internalEmail({
    to,
    subject: t.distributor.subject(data.folio, type, data.departmentName),
    heading: t.distributor.heading(data.folio),
    fields: [
      [f.businessName, data.businessName],
      [f.businessType, type],
      [f.nit, data.nit],
      [f.department, data.departmentName],
      [f.municipality, data.municipality],
      [f.name, data.name],
      [f.phone, phoneOf(data.phone)],
      [f.email, data.email],
    ],
    adminUrl,
    createdAt: data.createdAt,
    replyTo: data.email,
  });
}

export function distributorAck(
  data: DistributorMailData,
  { whatsappNumber }: { whatsappNumber: string | null },
): MailMessage | null {
  return ackEmail({
    to: data.email,
    name: data.name,
    subject: t.distributor.ackSubject(data.folio),
    received: t.distributor.ackReceived(data.folio),
    folio: data.folio,
    whatsappNumber,
  });
}

/** Mensaje de contacto, a Ventas. Sin acuse. */
export function contactSalesEmail(
  data: ContactMailData,
  { to, adminUrl }: { to: string; adminUrl: string },
): MailMessage {
  const f = t.contact.fields;
  const subject = optionLabel(contactSubjectOptions, data.subject);
  return internalEmail({
    to,
    subject: t.contact.subject(subject),
    heading: t.contact.heading,
    fields: [
      [f.subject, subject],
      [f.name, data.name],
      [f.phone, phoneOf(data.phone)],
      [f.email, data.email],
    ],
    message: data.message,
    messageTitle: t.contact.messageTitle,
    adminUrl,
    createdAt: data.createdAt,
    replyTo: data.email,
  });
}
