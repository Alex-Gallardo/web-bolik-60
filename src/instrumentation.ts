/**
 * Se ejecuta una vez al iniciar cada servidor de Next, antes de atender peticiones. El código de
 * Node vive en instrumentation-node.ts y se importa solo en ese runtime (el bundle Edge no lo incluye).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") await import("./instrumentation-node");
}
