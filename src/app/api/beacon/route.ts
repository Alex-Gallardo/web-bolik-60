import {
  BEACON_MAX_BYTES,
  beaconSchema,
  deviceTypeOf,
  toOutboundClick,
} from "@/features/analytics/outbound";
import { recordOutboundClick } from "@/server/data/outbound-clicks";
import { log } from "@/server/log";
import { createRateLimiter } from "@/server/rate-limit";
import { readBodyLimited } from "@/server/read-body";
import { clientIp, hashIp, ipKey, isVisitorIp } from "@/server/request-ip";

/**
 * Clics salientes (BD-083, docs/12 §4): el script del layout del sitio
 * (features/analytics/outbound-script.ts) manda aquí, con navigator.sendBeacon, cada clic a una
 * tienda en línea, a «Cómo llegar» o a WhatsApp, y se guarda en OutboundClick. Sin datos
 * personales (ni la IP: su hash solo cuenta el límite, en memoria).
 *
 * Responde 204 a todo, porque es estadística y no le dice nada a quien llama, salvo un cuerpo de
 * más de 2 KB: 413 (criterio del ticket). No cuenta avisos de otro sitio, inválidos, con datos que
 * no existen ni los que pasan de 60 por minuto desde una IP: así nadie llena la tabla.
 */

/** 60 clics por minuto por IP: una persona no llega; un script que insiste, sí. */
const limiter = createRateLimiter({ max: 60, windowMs: 60_000 });

const noContent = () => new Response(null, { status: 204 });

export async function POST(request: Request) {
  const body = await readBodyLimited(request, BEACON_MAX_BYTES);
  if (body === "too-large") return new Response(null, { status: 413 });

  // Los navegadores modernos dicen de dónde sale la petición: un aviso de otro sitio no cuenta.
  const site = request.headers.get("sec-fetch-site");
  if (!body || (site && site !== "same-origin")) return noContent();

  let json: unknown;
  try {
    json = JSON.parse(body);
  } catch {
    return noContent();
  }
  const parsed = beaconSchema.safeParse(json);
  if (!parsed.success) return noContent();

  // Como el login: sin la IP del visitante (sin X-Forwarded-For, el propio servidor) todos
  // compartirían una clave y 60 por minuto serían para todo el sitio. Una IP compartida (CGNAT)
  // queda con el mismo cupo: la estadística prefiere contar de menos a dejar pasar un script.
  const ip = clientIp(request.headers);
  if (isVisitorIp(ip) && !limiter.take(hashIp(ipKey(ip))).ok) return noContent();

  try {
    await recordOutboundClick(toOutboundClick(parsed.data, deviceTypeOf(request.headers)));
  } catch (error) {
    // La estadística nunca rompe nada: se registra y se sigue.
    log.error({ err: error, event: parsed.data.e }, "No se pudo guardar el clic saliente");
  }
  return noContent();
}
