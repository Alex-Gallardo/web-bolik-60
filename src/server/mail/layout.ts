import "server-only";

/**
 * Piezas comunes de los correos (BD-074, BD-076): HTML sencillo para Outlook (tablas y estilos en
 * línea, sin imágenes externas ni CSS en <head>). Todo lo que escribió el visitante se escapa: nunca
 * se interpreta como HTML.
 */

/**
 * Colores de tokens.css (docs/02): los clientes de correo no entienden variables de CSS, así que van
 * los valores. Si cambia la paleta, cambiarlos aquí también.
 */
export const C = {
  blue: "#1d3fce", // check-colors-ignore
  ink: "#111318", // check-colors-ignore
  muted: "#4b5368", // check-colors-ignore
  line: "#e3e7f0", // check-colors-ignore
  soft: "#f4f6fb", // check-colors-ignore
  paper: "#ffffff", // check-colors-ignore
} as const;

export const FONT = "font-family:Segoe UI,Arial,sans-serif;";

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
export const html = (value: string) => escapeHtml(value).replace(/\r?\n/g, "<br>");

export const dateGt = (date: Date) =>
  new Intl.DateTimeFormat("es-GT", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "America/Guatemala",
  }).format(date);

/** Marco común: una columna de 600 px centrada, fondo suave y franja azul de marca. */
export function frame(content: string, title: string): string {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(title)}</title></head><body style="margin:0;padding:0;background:${C.soft}" bgcolor="${C.soft}"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${C.soft}" style="background:${C.soft}"><tr><td align="center" style="padding:24px 12px"><table role="presentation" width="600" cellpadding="0" cellspacing="0" bgcolor="${C.paper}" style="max-width:600px;width:100%;background:${C.paper};border:1px solid ${C.line}"><tr><td bgcolor="${C.blue}" style="background:${C.blue};padding:16px 24px;${FONT}font-size:20px;font-weight:bold;color:${C.paper}">BOLIK</td></tr><tr><td style="padding:24px;${FONT}font-size:15px;line-height:1.5;color:${C.ink}">${content}</td></tr></table></td></tr></table></body></html>`;
}

export const p = (content: string, style = "") =>
  `<p style="margin:0 0 16px;${style}">${content}</p>`;
export const h1 = (content: string) =>
  `<h1 style="${FONT}font-size:22px;margin:0 0 4px;color:${C.ink}">${content}</h1>`;
export const h2 = (content: string) =>
  `<h2 style="${FONT}font-size:17px;margin:24px 0 8px;color:${C.ink}">${content}</h2>`;
export const footnote = (content: string) =>
  `<p style="margin:24px 0 0;font-size:12px;color:${C.muted}">${content}</p>`;

/** Etiqueta y valor de un dato; sin valor, `empty`. */
export type MailField = [label: string, value: string | undefined];

/** Tabla de datos (etiqueta en gris, valor escapado). */
export function fieldsTable(fields: MailField[], empty: string): string {
  const cell = `style="${FONT}padding:4px 12px 4px 0;font-size:14px;vertical-align:top"`;
  const rows = fields
    .map(
      ([label, value]) =>
        `<tr><td ${cell}><span style="color:${C.muted}">${label}</span></td><td ${cell}>${value ? html(value) : empty}</td></tr>`,
    )
    .join("");
  return `<table role="presentation" cellpadding="0" cellspacing="0">${rows}</table>`;
}

/** Botón «a prueba de Outlook»: el color va en la celda (Outlook ignora padding y fondo de un <a>). */
export function mailButton(href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0"><tr><td bgcolor="${C.blue}" style="background:${C.blue};border-radius:6px"><a href="${escapeHtml(href)}" style="display:inline-block;padding:12px 24px;${FONT}font-weight:bold;color:${C.paper};text-decoration:none">${label}</a></td></tr></table>`;
}

/** El folio en negrita dentro de un texto ya escapado. */
export const boldFolio = (text: string, folio: string) =>
  escapeHtml(text).replace(escapeHtml(folio), `<strong>${escapeHtml(folio)}</strong>`);
