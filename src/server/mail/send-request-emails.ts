import "server-only";
import { env } from "@/env";
import { ACK_GUARD } from "@/lib/form-guard";
import { publicEnv } from "@/env.public";
import { getSiteSettings } from "@/server/data/content";
import { countRecentRequestsByEmail, type RequestForm } from "@/server/data/form-requests";
import { log, logError } from "@/server/log";
import {
  contactSalesEmail,
  distributorAck,
  distributorSalesEmail,
  schoolAck,
  schoolSalesEmail,
  type ContactMailData,
  type DistributorMailData,
  type SchoolMailData,
} from "./request-emails";
import { sendMail, type MailMessage } from "./transport";

/** Ruta del admin de cada bandeja (las pantallas llegan con BD-120). */
const ADMIN_PATH: Record<RequestForm, string> = {
  school: "escuelas",
  distributor: "distribuidores",
  contact: "mensajes",
};

export const adminRequestUrl = (form: RequestForm, id: number) =>
  `${publicEnv.siteUrl.replace(/\/$/, "")}/admin/${ADMIN_PATH[form]}/${id}`;

/** A quién llega cada formulario: su bandeja del entorno o, sin ella, la de Ventas. */
export function requestInbox(form: RequestForm): string {
  if (form === "school") return env.MAIL_SCHOOLS_TO ?? env.MAIL_SALES_TO;
  if (form === "distributor") return env.MAIL_DISTRIBUTORS_TO ?? env.MAIL_SALES_TO;
  return env.MAIL_SALES_TO;
}

type Ids = { form: RequestForm; id: number; folio: string | null };

/**
 * El interno siempre y, si hay, el acuse (con el tope por dirección de la cotización). Nunca lanza:
 * cada fallo queda en el log, sin datos personales. Lo llama cada acción con after().
 */
async function send(
  { form, id, folio }: Ids,
  internal: MailMessage,
  ack: ((whatsappNumber: string | null) => MailMessage | null) | null,
): Promise<void> {
  try {
    await sendMail(internal);
  } catch (error) {
    logError(error, { action: `sendRequestEmails.${form}`, folio: folio ?? undefined, id });
  }
  if (!ack) return;

  let whatsappNumber: string | null = null;
  try {
    whatsappNumber = (await getSiteSettings()).whatsappNumber;
  } catch (error) {
    // Sin ajustes, el acuse sale igual, sin WhatsApp.
    logError(error, { action: `sendRequestEmails.${form}.settings`, folio: folio ?? undefined });
  }
  const message = ack(whatsappNumber);
  if (!message) return;
  try {
    const since = new Date(Date.now() - ACK_GUARD.windowMs);
    if ((await countRecentRequestsByEmail(form, message.to, since)) > ACK_GUARD.maxPerEmail) {
      log.info({ form, folio }, "Acuse omitido: varias solicitudes a la misma dirección");
      return;
    }
    await sendMail(message);
  } catch (error) {
    logError(error, { action: `sendRequestEmails.${form}.ack`, folio: folio ?? undefined });
  }
}

export const sendSchoolEmails = (data: SchoolMailData) =>
  send(
    { form: "school", id: data.id, folio: data.folio },
    schoolSalesEmail(data, {
      to: requestInbox("school"),
      adminUrl: adminRequestUrl("school", data.id),
    }),
    (whatsappNumber) => schoolAck(data, { whatsappNumber }),
  );

export const sendDistributorEmails = (data: DistributorMailData) =>
  send(
    { form: "distributor", id: data.id, folio: data.folio },
    distributorSalesEmail(data, {
      to: requestInbox("distributor"),
      adminUrl: adminRequestUrl("distributor", data.id),
    }),
    (whatsappNumber) => distributorAck(data, { whatsappNumber }),
  );

export const sendContactEmails = (data: ContactMailData) =>
  send(
    { form: "contact", id: data.id, folio: null },
    contactSalesEmail(data, {
      to: requestInbox("contact"),
      adminUrl: adminRequestUrl("contact", data.id),
    }),
    null,
  );
