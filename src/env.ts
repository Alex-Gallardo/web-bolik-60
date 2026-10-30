import "server-only";
import { parseServerEnv, shouldSkipEnvValidation, type ServerEnv } from "./env.schema";

/**
 * Variables de entorno del SERVIDOR, validadas al cargar. Única puerta de entrada a process.env
 * en la app (regla de lint). Para el cliente usa src/env.public.ts (solo NEXT_PUBLIC_*).
 * Con SKIP_ENV_VALIDATION (solo CI) los valores llegan sin validar ni defaults: no confíes en sus
 * tipos ahí; en staging y producción el skip se ignora.
 */
export const env: ServerEnv = shouldSkipEnvValidation(process.env)
  ? (process.env as unknown as ServerEnv)
  : parseServerEnv(process.env);
