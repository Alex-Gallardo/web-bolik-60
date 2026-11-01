import "server-only";
import { randomUUID } from "node:crypto";
import pino, { type DestinationStream, type Logger } from "pino";
import pretty from "pino-pretty";

/**
 * Logs del servidor (docs/15 §9). En producción, una línea JSON por evento en stdout (NSSM la
 * guarda en D:\bolik\logs); en desarrollo, texto legible. Nunca se registran datos personales ni
 * secretos: las claves de REDACT_PATHS se reemplazan por "[oculto]".
 */

/** Claves sensibles, en la raíz y un nivel adentro (p. ej. `{ cliente: { correo } }`). */
const SENSITIVE_KEYS = [
  "password",
  "contrasena",
  "token",
  "secret",
  "authorization",
  "cookie",
  "email",
  "correo",
  "phone",
  "telefono",
  "nombre",
  "nit",
];
export const REDACT_PATHS = [
  ...SENSITIVE_KEYS,
  ...SENSITIVE_KEYS.map((key) => `*.${key}`),
  "headers.cookie",
  "headers.authorization",
];

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
      redact: { paths: REDACT_PATHS, censor: "[oculto]" },
    },
    stream,
  );
}

// eslint-disable-next-line no-restricted-properties -- NODE_ENV lo fija Next; no es configuración.
const isDev = process.env.NODE_ENV === "development";
export const log = createLogger({ pretty: isDev, level: isDev ? "debug" : "info" });

/** Código corto para mostrar al visitante y buscar en el log: "4F9A1C2B". */
export function newRequestId(): string {
  return randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase();
}

/**
 * Registra un error de una Server Action y devuelve su código de referencia para el mensaje al
 * visitante. `context` no debe llevar datos personales (igual se ocultan por REDACT_PATHS).
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
