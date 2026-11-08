import type { ErpGateway } from "./types";

/**
 * ERP apagado (ERP_MODE=noop, BD-035): no llama a nada. Las cotizaciones quedan solo en la base y
 * en el correo a Ventas (erpStatus = omitida); la sincronización del catálogo no hace nada.
 */
export const noopGateway: ErpGateway = {
  mode: "noop",
  async createLead() {
    return { status: "skipped" };
  },
  async listArticles() {
    return { status: "skipped" };
  },
};
