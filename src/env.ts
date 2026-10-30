import "server-only";
import { parseServerEnv, type ServerEnv } from "./env.schema";

/**
 * Variables de entorno del SERVIDOR, validadas al cargar. Única puerta de entrada a process.env
 * en la app (regla de lint). Para el cliente usa src/env.public.ts (solo NEXT_PUBLIC_*).
 * SKIP_ENV_VALIDATION=true (solo CI sin secretos) omite la validación y los valores por defecto.
 */
export const env: ServerEnv =
  process.env.SKIP_ENV_VALIDATION === "true"
    ? (process.env as unknown as ServerEnv)
    : parseServerEnv(process.env);
