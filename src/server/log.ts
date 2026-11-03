import "server-only";
import { randomUUID } from "node:crypto";
import pino, { type DestinationStream, type Logger } from "pino";
import pretty from "pino-pretty";
import { redact } from "@/lib/redact";

/**
 * Logs del servidor (docs/15 §9). En producción, una línea JSON por evento en stdout (NSSM la
 * guarda en D:\bolik\logs); en desarrollo, texto legible. Nunca se registran datos personales ni
 * secretos: cada línea pasa por redact() (claves sensibles a cualquier profundidad, y correos y
 * teléfonos dentro de los textos, incluidos los mensajes de error).
 */

type LoggerOptions = { pretty?: boolean; level?: string; destination?: DestinationStream };

export function createLogger({
  pretty: usePretty = false,
  level = "info",
  destination,
}: LoggerOptions = {}): Logger {
  const stream =
    destination ??
    (usePretty ? pretty({ colorize: true, translateTime: "SYS:HH:MM:ss" }) : undefined);
  return pino(
    {
      level,
      base: { app: "bolik-digital" },
      timestamp: pino.stdTimeFunctions.isoTime,
      formatters: { log: (object) => redact(object) as Record<string, unknown> },
    },
    stream,
  );
}

// eslint-disable-next-line no-restricted-properties -- NODE_ENV lo fija Next; no es configuración.
const isDev = process.env.NODE_ENV === "development";
export const log = createLogger({ pretty: isDev, level: isDev ? "debug" : "info" });

/**
 * Código corto para mostrar al visitante y buscar en el log: "4F9A1C2B". Siempre lleva al menos
 * una letra: 8 dígitos parecen un teléfono y redact() los ocultaría del log (1 de cada 43).
 */
export function newRequestId(): string {
  let id: string;
  do id = randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase();
  while (!/[A-F]/.test(id));
  return id;
}

/**
 * Registra un error de una Server Action y devuelve su código de referencia para el mensaje al
 * visitante. El contexto se limpia igual que todo el log, pero no le pases datos personales.
 */
export function logError(
  error: unknown,
  context: Record<string, unknown> = {},
  logger: Logger = log,
): string {
  const requestId = newRequestId();
  logger.error({ ...context, requestId, err: error }, "error en acción");
  return requestId;
}

/** Quita la query string (puede traer datos del visitante): "/buscar?q=ana" → "/buscar". */
export function pathWithoutQuery(path: string): string {
  return path.split("?")[0] ?? path;
}
