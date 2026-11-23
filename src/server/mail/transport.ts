import "server-only";
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import nodemailer, { type Transporter } from "nodemailer";
import { env } from "@/env";

/**
 * Envío de correos (BD-074, docs/03 §9). Dos modos (SMTP_MODE):
 * - `file` (desarrollo, staging y mientras no haya cuenta de correo): no sale nada a internet. Cada
 *   correo queda en tmp/mails como `.eml` (se abre con Outlook o cualquier cliente) y como `.json`
 *   (lo muestra la bandeja de prueba de /styleguide/correos para presentarlo).
 * - `smtp` (producción, obligatorio ahí; Office 365 con la cuenta web@bolik66.com).
 * Cambiar de modo es solo configuración: SMTP_MODE=smtp con SMTP_HOST, SMTP_USER y SMTP_PASSWORD.
 */

export type MailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** A quién responde el destinatario (el correo interno: al cliente, si dejó correo). */
  replyTo?: string;
};

/** Correo guardado en modo `file`, como lo lee la bandeja de prueba. */
export type StoredMail = MailMessage & { id: string; from: string; date: string };

/**
 * Carpeta de los correos de prueba: MAIL_DIR o tmp/mails (ignorada por git). En el servidor va fuera
 * del release, donde la cuenta del servicio sí puede escribir (docs/15 §11).
 */
export const MAIL_DIR = env.MAIL_DIR ?? path.join(process.cwd(), "tmp", "mails");

/** Los que se conservan: una sesión larga no llena el disco. */
const KEEP = 200;

let smtp: Transporter | null = null;

function smtpTransport(): Transporter {
  smtp ??= nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465, // 587 (Office 365): STARTTLS
    requireTLS: env.SMTP_PORT !== 465,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });
  return smtp;
}

/** Un salto de línea en el asunto o en una dirección permitiría inyectar cabeceras. */
const oneLine = (value: string) => value.replace(/[\r\n]+/g, " ").trim();

/**
 * Manda un correo (o lo guarda, en modo `file`). Lanza si falla: quien llama decide (en
 * submitQuote, after() lo registra con logError y el visitante ya recibió su folio).
 */
export async function sendMail(
  message: MailMessage,
  { mode = env.SMTP_MODE, dir = MAIL_DIR }: { mode?: "file" | "smtp"; dir?: string } = {},
): Promise<void> {
  const mail = {
    from: env.MAIL_FROM,
    to: oneLine(message.to),
    subject: oneLine(message.subject),
    html: message.html,
    text: message.text,
    replyTo: message.replyTo ? oneLine(message.replyTo) : undefined,
  };
  if (mode === "smtp") {
    await smtpTransport().sendMail(mail);
    return;
  }
  const raw = await nodemailer
    .createTransport({ streamTransport: true, buffer: true, newline: "windows" })
    .sendMail(mail);
  const date = new Date();
  const id = `${date.toISOString().replace(/[:.]/g, "-")}-${Math.random().toString(36).slice(2, 8)}`;
  await mkdir(dir, { recursive: true });
  const stored: StoredMail = { ...mail, replyTo: mail.replyTo, id, date: date.toISOString() };
  // Primero el .json (la bandeja y la poda se guían por él): nunca queda un .eml sin podar.
  await writeFile(path.join(dir, `${id}.json`), JSON.stringify(stored, null, 2));
  await writeFile(path.join(dir, `${id}.eml`), raw.message as Buffer);
  await prune(dir);
}

async function storedIds(dir: string): Promise<string[]> {
  try {
    const files = await readdir(dir);
    return files
      .filter((f) => f.endsWith(".json"))
      .map((f) => f.slice(0, -".json".length))
      .sort()
      .reverse(); // el id empieza con la fecha: más nuevos primero
  } catch {
    return []; // todavía no hay carpeta
  }
}

async function prune(dir: string) {
  const old = (await storedIds(dir)).slice(KEEP);
  await Promise.all(
    old.flatMap((id) =>
      [".eml", ".json"].map((ext) => rm(path.join(dir, id + ext), { force: true })),
    ),
  );
}

/** Los últimos correos guardados en modo `file` (bandeja de prueba), más nuevos primero. */
export async function listStoredMails(limit = 20, dir = MAIL_DIR): Promise<StoredMail[]> {
  const ids = (await storedIds(dir)).slice(0, limit);
  const mails = await Promise.all(
    ids.map(async (id) => {
      try {
        return JSON.parse(await readFile(path.join(dir, `${id}.json`), "utf8")) as StoredMail;
      } catch {
        return null;
      }
    }),
  );
  return mails.filter((m): m is StoredMail => m !== null);
}
