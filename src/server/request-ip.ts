import "server-only";
import { createHmac } from "node:crypto";
import { headers } from "next/headers";
import { env } from "@/env";
import { log } from "@/server/log";

/**
 * IP de quien hace la petición, para el límite de envíos de los formularios públicos (BD-073,
 * docs/03 §8). En IIS con ARR, el proxy AGREGA la IP real al final de X-Forwarded-For: se toma la
 * última. Las anteriores las pudo escribir el propio visitante (un bot que cambia la cabecera en
 * cada envío se saltaría el límite si se usara la primera). Sin cabecera, "desconocida".
 */
export function clientIp(source: Pick<Headers, "get">): string {
  const forwarded = source.get("x-forwarded-for")?.split(",").at(-1)?.trim();
  const raw = forwarded || source.get("x-real-ip")?.trim();
  if (!raw) {
    // En producción, sin cabecera todos comparten un cupo: indica ARR mal configurado (docs/15).
    log.warn("Petición sin X-Forwarded-For: el límite por IP la cuenta como una sola IP");
    return "desconocida";
  }
  return normalizeIp(raw);
}

/**
 * Sin puerto ni prefijo de IPv4 en IPv6: ARR puede agregar el puerto del cliente («Include TCP port
 * from client IP»), distinto en cada conexión, y entonces cada envío tendría un hash nuevo y el
 * límite no serviría. "190.56.1.2:51234" → "190.56.1.2"; "[2001:db8::1]:443" → "2001:db8::1";
 * "::ffff:190.56.1.2" → "190.56.1.2".
 */
export function normalizeIp(raw: string): string {
  let ip = raw.trim();
  const bracketed = /^\[([^\]]+)\](?::\d+)?$/.exec(ip);
  if (bracketed) ip = bracketed[1]!;
  else if (/^[\d.]+:\d+$/.test(ip)) ip = ip.slice(0, ip.lastIndexOf(":"));
  ip = ip.toLowerCase();
  if (ip.startsWith("::ffff:") && /^[\d.]+$/.test(ip.slice(7))) ip = ip.slice(7);
  return ip;
}

/**
 * La IP nunca se guarda en claro (datos personales, docs/03 §8): HMAC-SHA256 con SESSION_SECRET
 * (64 caracteres hexadecimales, la columna ipHash). Sin la clave no se puede volver a la IP ni
 * comparar con una lista de IPs conocidas.
 */
export function hashIp(ip: string, secret: string = env.SESSION_SECRET): string {
  return createHmac("sha256", secret).update(ip).digest("hex");
}

/**
 * Lo que identifica a quien visita para los límites (BD-077): la IPv4 entera y, en IPv6, solo el
 * prefijo /64. Un acceso residencial con IPv6 recibe un /64 completo y podría estrenar dirección en
 * cada intento para saltarse el límite (y llenar la memoria del limitador).
 */
export function ipKey(ip: string): string {
  if (!ip.includes(":")) return ip;
  const [head = "", tail] = ip.split("::");
  const left = head ? head.split(":") : [];
  const right = tail ? tail.split(":") : [];
  const groups =
    tail === undefined
      ? left
      : [...left, ...Array(8 - left.length - right.length).fill("0"), ...right];
  return `${groups
    .slice(0, 4)
    .map((g) => g.replace(/^0+(?=.)/, ""))
    .join(":")}::/64`;
}

/**
 * ¿Es la IP real del visitante? No lo es «desconocida» (sin cabecera) ni la del propio servidor:
 * sin X-Forwarded-For de ARR, Next pone la dirección del socket (127.0.0.1 o ::1, el proxy). En ese
 * caso todos compartirían una clave y el límite por IP del login dejaría fuera a todo el equipo.
 */
export function isVisitorIp(ip: string): boolean {
  return ip !== "desconocida" && ip !== "::1" && !/^127./.test(ip);
}

/** Hash de la IP de la petición en curso (Server Action o route handler). */
export async function requestIpHash(): Promise<string> {
  return (await requestIp()).hash;
}

/** El hash y si es la IP de un visitante (el login solo limita por IP cuando lo es, BD-077). */
export async function requestIp(): Promise<{ hash: string; visitor: boolean }> {
  const ip = clientIp(await headers());
  return { hash: hashIp(ipKey(ip)), visitor: isVisitorIp(ip) };
}
