import type { Instrumentation } from "next";

/**
 * Se ejecuta una vez al iniciar cada servidor de Next, antes de atender peticiones. El código de
 * Node vive en instrumentation-node.ts y se importa solo en ese runtime (el bundle Edge no lo incluye).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") await import("./instrumentation-node");
}

/**
 * Cada error del servidor queda en el log con el `digest` de Next como código de referencia: es el
 * mismo que ve el visitante en la pantalla de error (components/feedback/error-screen.tsx).
 */
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { log, pathWithoutQuery } = await import("./server/log");
  const digest =
    typeof err === "object" && err !== null && "digest" in err ? String(err.digest) : undefined;
  log.error(
    {
      requestId: digest,
      path: pathWithoutQuery(request.path),
      method: request.method,
      routePath: context.routePath,
      routeType: context.routeType,
      err,
    },
    "error en petición",
  );
};
