import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { env } from "@/env";
import { customerQuoteAck, salesQuoteEmail, type QuoteMailData } from "@/server/mail/quote-emails";
import { adminQuoteUrl } from "@/server/mail/send-quote-emails";
import { listStoredMails, type MailMessage } from "@/server/mail/transport";

/**
 * Bandeja de prueba de los correos (BD-074): para presentar cómo funciona la cotización mientras no
 * hay cuenta de correo ni conexión a SAP. Muestra el modo activo, los dos correos con datos de
 * ejemplo y los últimos que generó el sitio (SMTP_MODE=file: tmp/mails). Como todo /styleguide, en
 * producción solo con sesión de admin.
 */
export const metadata: Metadata = {
  title: "Correos · Styleguide",
  robots: { index: false, follow: false },
};

/** Una cotización de ejemplo (productos del catálogo de ejemplo). */
const SAMPLE: QuoteMailData = {
  quoteId: 123,
  folio: "COT-2027-000123",
  customerType: "libreria",
  organization: "Librería El Estudiante",
  name: "Ana López",
  phone: "55551234",
  email: "ana@ejemplo.com",
  departmentName: "Quetzaltenango",
  municipality: "Quetzaltenango",
  notes: "Para el inicio de clases en enero.\nSi hay, la mitad en azul y la mitad en negro.",
  items: [
    {
      productName: "Bolik Ultra",
      colorName: "Azul",
      sku: "PT00058",
      packagingName: "Cajilla de 12",
      quantity: 20,
      unitLabel: "cajillas de 12",
    },
    {
      productName: "Bolik Ultra",
      colorName: "Negro",
      sku: "PT00059",
      packagingName: "Cajilla de 12",
      quantity: 20,
      unitLabel: "cajillas de 12",
    },
  ],
  createdAt: new Date("2027-01-12T15:30:00Z"),
};

/** Un correo tal como se ve: asunto, destinatario y su HTML (en un iframe sin scripts). */
function MailPreview({ mail, date }: { mail: MailMessage; date?: string }) {
  return (
    <article className="flex flex-col gap-3 rounded-lg border-2 border-line bg-paper p-4">
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        <dt className="text-muted">Asunto</dt>
        <dd className="font-bold">{mail.subject}</dd>
        <dt className="text-muted">Para</dt>
        <dd>{mail.to}</dd>
        {mail.replyTo ? (
          <>
            <dt className="text-muted">Responder a</dt>
            <dd>{mail.replyTo}</dd>
          </>
        ) : null}
        {date ? (
          <>
            <dt className="text-muted">Fecha</dt>
            <dd>
              {new Intl.DateTimeFormat("es-GT", {
                dateStyle: "medium",
                timeStyle: "short",
                timeZone: "America/Guatemala",
              }).format(new Date(date))}
            </dd>
          </>
        ) : null}
      </dl>
      {/* sandbox vacío: el HTML del correo no corre scripts ni navega la página. */}
      <iframe
        title={`Vista del correo: ${mail.subject}`}
        srcDoc={mail.html}
        sandbox=""
        className="h-[32rem] w-full rounded-md border-2 border-line bg-soft"
      />
    </article>
  );
}

/** Los que generó el sitio (lee tmp/mails en cada visita: va en Suspense). */
async function Inbox() {
  await connection();
  if (env.SMTP_MODE !== "file")
    return (
      <p className="text-muted">
        Con <code>SMTP_MODE=smtp</code> los correos salen de verdad y no se guardan aquí.
      </p>
    );
  const mails = await listStoredMails(20);
  if (mails.length === 0)
    return (
      <p className="text-muted">
        Todavía no hay correos. Envía una cotización desde <a href="/cotizacion">/cotizacion</a> o
        una solicitud desde <a href="/styleguide/formularios">los formularios</a> y vuelve a esta
        página.
      </p>
    );
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {mails.map((mail) => (
        <MailPreview key={mail.id} mail={mail} date={mail.date} />
      ))}
    </div>
  );
}

/**
 * Modo activo, destinatario y ejemplos: se leen del entorno en cada visita (no en el build). Así, en
 * staging, cambiar SMTP_MODE o ERP_MODE y reiniciar el servicio basta para que la página lo diga.
 */
async function Live() {
  await connection();
  const sales = salesQuoteEmail(SAMPLE, {
    to: env.MAIL_SALES_TO,
    adminUrl: adminQuoteUrl(SAMPLE.quoteId),
  });
  const ack = customerQuoteAck(SAMPLE, { whatsappNumber: "55551234" })!;
  return (
    <>
      <section aria-labelledby="modo" className="flex flex-col gap-3">
        <h2 id="modo">Modo activo</h2>
        <ul className="flex list-disc flex-col gap-1 ps-6">
          <li>
            Correo: <strong>{env.SMTP_MODE === "file" ? "de prueba" : "real (SMTP)"}</strong>
            {env.SMTP_MODE === "file"
              ? ": no sale nada a internet; cada correo queda en tmp/mails (.eml, se abre con Outlook) y en esta página."
              : "."}
          </li>
          <li>
            SAP:{" "}
            <strong>
              {env.ERP_MODE === "noop" ? "sin conexión (prueba)" : "conectado (SMART-K66)"}
            </strong>
            {env.ERP_MODE === "noop"
              ? ": las cotizaciones quedan como «omitida» y no se mandan a SAP."
              : "."}
          </li>
          <li>
            Las cotizaciones llegan a: <strong>{env.MAIL_SALES_TO}</strong> (o al ajuste
            «quote_email_to» del admin).
          </li>
        </ul>
      </section>

      <section aria-labelledby="ejemplo" className="flex flex-col gap-4">
        <h2 id="ejemplo">Con datos de ejemplo</h2>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="flex flex-col gap-2">
            <h3>A Ventas</h3>
            <MailPreview mail={sales} />
          </div>
          <div className="flex flex-col gap-2">
            <h3>Acuse al cliente</h3>
            <MailPreview mail={ack} />
          </div>
        </div>
      </section>
    </>
  );
}

export default function CorreosPage() {
  return (
    <div className="container-site flex flex-col gap-12 py-16">
      <header className="flex flex-col gap-2">
        <p className="eyebrow text-blue">Styleguide</p>
        <h1>Correos de cotización (modo prueba)</h1>
        <p className="max-w-3xl text-muted">
          Cuando alguien envía una cotización, el sitio la guarda con su folio, le responde al
          instante y, después, manda un correo a Ventas y un acuse al cliente (si dejó correo). Aquí
          se ven los dos correos y los últimos que generó el sitio.
        </p>
      </header>

      <Suspense fallback={<p className="text-muted">Cargando…</p>}>
        <Live />
      </Suspense>

      <section aria-labelledby="bandeja" className="flex flex-col gap-4">
        <h2 id="bandeja">Últimos correos del sitio</h2>
        <Suspense fallback={<p className="text-muted">Cargando…</p>}>
          <Inbox />
        </Suspense>
      </section>
    </div>
  );
}
