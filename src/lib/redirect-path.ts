/**
 * Rutas de redirecciones y 404 (BD-046, docs/10 §6). Una sola forma de escribir cada ruta, para que
 * la que llega en la petición, la de la tabla Redirect y la de NotFoundLog coincidan: minúsculas
 * (SQL Server compara sin mayúsculas), sin barra final, con los acentos codificados siempre igual
 * (`/Café` y `/caf%C3%A9` son la misma ruta) y con la query ordenada, sin parámetros de
 * seguimiento ni internos de Next.
 * `/Index.php/Productos/?b=2&a=1&utm_source=fb` → `/index.php/productos?a=1&b=2`.
 */

/** Largo de Redirect.fromPath y NotFoundLog.path en la base. */
export const MAX_PATH_LENGTH = 450;

/**
 * Parámetros que no forman parte de la dirección: los de seguimiento de campañas y redes (cada clic
 * trae el suyo, y pueden traer datos personales) y el interno de Next en la navegación RSC.
 */
const IGNORED_PARAM = /^(utm_.*|gclid|fbclid|msclkid|_ga|mc_eid|_rsc)$/;

/** Ruta con los acentos decodificados, en minúsculas, sin barra final y vuelta a codificar. */
function canonicalPathname(pathname: string): string {
  let decoded = pathname;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    // Una secuencia % inválida se deja tal cual.
  }
  let path = decoded.toLowerCase();
  if (!path.startsWith("/")) path = `/${path}`;
  if (path.length > 1) path = path.replace(/\/+$/, "") || "/";
  // Concatenado y no como base: «//otro» sería un host, no una ruta.
  return new URL(`http://x${path}`).pathname;
}

export function normalizeRedirectPath(pathname: string, search = ""): string {
  const path = canonicalPathname(pathname);
  const params = new URLSearchParams();
  for (const [key, value] of new URLSearchParams(search)) {
    const name = key.toLowerCase();
    if (!IGNORED_PARAM.test(name)) params.append(name, value.toLowerCase());
  }
  params.sort();
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

/** Normaliza una ruta guardada como texto («/viejo?x=1»). */
export function normalizeStoredPath(value: string): string {
  const trimmed = value.trim();
  const q = trimmed.indexOf("?");
  return q === -1
    ? normalizeRedirectPath(trimmed)
    : normalizeRedirectPath(trimmed.slice(0, q), trimmed.slice(q));
}

/** La misma ruta sin la query (para encontrar `/viejo` cuando llega `/viejo?ref=algo`). */
export function withoutQuery(normalized: string): string {
  const q = normalized.indexOf("?");
  return q === -1 ? normalized : normalized.slice(0, q);
}

/**
 * Destino interno y seguro: empieza con una sola «/» (nunca «//otro-dominio» ni «/\otro»), sin
 * espacios ni caracteres de control. Una redirección nunca manda a otro sitio (redirección abierta).
 */
export function isInternalPath(value: string): boolean {
  return /^\/(?![/\\])[^\s\\\p{Cc}]*$/u.test(value) && value.length <= MAX_PATH_LENGTH;
}

export type RedirectStatus = 301 | 302 | 307 | 308;

export type RedirectRow = { fromPath: string; toPath: string; statusCode: number };

/** Destino ya resuelto; `fromPath` es la fila original (tal como está guardada), para contar sus usos. */
export type RedirectTarget = { to: string; status: RedirectStatus; fromPath: string };

const STATUSES = new Set<number>([301, 302, 307, 308]);

/** Cuántos saltos se siguen al resolver una cadena antes de darla por ciclo. */
const MAX_HOPS = 10;

/**
 * Mapa de redirecciones listo para buscar: claves normalizadas, destinos internos, estado
 * 301/302/307/308 (otro valor cuenta como 301) y cadenas resueltas a un solo salto
 * (A → B y B → C dan A → C). Un ciclo, un destino externo o una clave repetida se descartan y
 * quedan en `skipped`.
 */
export function buildRedirectMap(rows: RedirectRow[]): {
  map: Map<string, RedirectTarget>;
  skipped: string[];
} {
  const direct = new Map<string, RedirectTarget>();
  const skipped: string[] = [];
  for (const row of rows) {
    const from = normalizeStoredPath(row.fromPath);
    const to = row.toPath.trim();
    if (!isInternalPath(from) || !isInternalPath(to) || normalizeStoredPath(to) === from) {
      skipped.push(row.fromPath);
      continue;
    }
    // Dos filas que quedan iguales al normalizar (`/viejo` y `/Viejo/`): gana la primera.
    if (direct.has(from)) {
      skipped.push(row.fromPath);
      continue;
    }
    const status = (STATUSES.has(row.statusCode) ? row.statusCode : 301) as RedirectStatus;
    direct.set(from, { to, status, fromPath: row.fromPath });
  }

  const map = new Map<string, RedirectTarget>();
  for (const [from, target] of direct) {
    let final = target;
    const seen = new Set([from]);
    let hops = 0;
    for (;;) {
      const next = normalizeStoredPath(final.to);
      if (seen.has(next) || hops >= MAX_HOPS) {
        final = { ...target, to: "" };
        break;
      }
      const further = direct.get(next);
      if (!further) break;
      seen.add(next);
      final = { ...target, to: further.to };
      hops += 1;
    }
    if (final.to) map.set(from, final);
    else skipped.push(from);
  }
  return { map, skipped };
}
