/**
 * Validación del entorno al arrancar el servidor (solo runtime Node; lo importa instrumentation.ts).
 * El servidor standalone (staging y producción) usa la config ya compilada y no vuelve a evaluar
 * next.config.ts: aquí se valida el entorno real con el que arranca (production.env).
 */
import { parseServerEnv, shouldSkipEnvValidation } from "./env.schema";

if (!shouldSkipEnvValidation(process.env)) {
  try {
    parseServerEnv(process.env);
  } catch (error) {
    // Next registra el error de register() y sigue atendiendo peticiones: sin un entorno válido
    // el servidor no debe arrancar (el servicio de Windows lo deja en el log y lo reintenta).
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
