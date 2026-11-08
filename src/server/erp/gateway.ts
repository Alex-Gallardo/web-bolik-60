import "server-only";
import { env } from "@/env";
import { log } from "@/server/log";
import { noopGateway } from "./noop";
import { createSmartK66Gateway } from "./smartk66";
import type { ErpGateway } from "./types";

/**
 * El gateway que corresponde a ERP_MODE (BD-035). `noop` (por defecto) no llama a nada;
 * `smartk66` exige ERP_BASE_URL y ERP_API_KEY (lo valida src/env.schema.ts al arrancar).
 * Se crea una vez por proceso.
 */
let gateway: ErpGateway | undefined;

export function getErpGateway(): ErpGateway {
  if (gateway) return gateway;
  if (env.ERP_MODE === "smartk66" && env.ERP_BASE_URL && env.ERP_API_KEY) {
    gateway = createSmartK66Gateway({ baseUrl: env.ERP_BASE_URL, apiKey: env.ERP_API_KEY });
  } else {
    // El esquema de entorno ya lo impide al arrancar; en un script o una prueba mal armada se avisa.
    if (env.ERP_MODE === "smartk66")
      log.warn("ERP: smartk66 sin URL o clave; queda apagado (noop)");
    gateway = noopGateway;
  }
  return gateway;
}
