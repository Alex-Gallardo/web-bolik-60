import type { AppEnv } from "./styleguide-access";
import type { Role } from "./constants";

/**
 * Reglas del acceso al admin sin efectos (BD-114, ADR-08, docs/03 §8): permisos por rol, la ruta
 * de vuelta tras el login y los atributos de la cookie. Las usan src/server/auth y proxy.ts.
 */

/** Cookie cifrada de la sesión (docs/03 §8). */
export const ADMIN_COOKIE = "bolik_admin";
/** 8 horas (docs/03 §8). */
export const ADMIN_SESSION_SECONDS = 8 * 60 * 60;
/** Bloqueo tras 5 intentos fallidos, por 15 minutos (feedback.admin.loginLocked). */
export const LOGIN_MAX_ATTEMPTS = 5;
export const LOGIN_LOCK_MINUTES = 15;
/**
 * Límite por IP (BD-077, decisión del usuario): 10 intentos fallidos en 15 minutos desde la misma IP,
 * con cualquier correo. Pasado, responde como una cuenta bloqueada, sin correr bcrypt.
 */
export const LOGIN_IP_MAX_FAILURES = 10;
export const LOGIN_IP_WINDOW_MINUTES = 15;
/** Coste de bcrypt (docs/05 §2): el seed, admin:create y el hash de relleno del login. */
export const BCRYPT_COST = 12;
/**
 * Tiempo mínimo de respuesta del login (ms): un correo registrado hace una escritura más que uno
 * que no existe; con este piso los dos tardan lo mismo.
 */
export const LOGIN_MIN_RESPONSE_MS = 600;
export const ADMIN_LOGIN_PATH = "/admin/login";
export const ADMIN_HOME_PATH = "/admin";
/** Ruta pedida que proxy.ts pasa a las páginas del admin (para volver tras el login). */
export const ADMIN_PATH_HEADER = "x-bolik-path";
/** Parámetros del login: a dónde volver y por qué se pidió de nuevo. */
export const NEXT_PARAM = "siguiente";
export const EXPIRED_PARAM = "vencida";
export const DENIED_PARAM = "sin-permiso";
export const LOGGED_OUT_PARAM = "salida";
/** Error del último intento (?error=invalid): el login lo muestra arriba del formulario. */
export const LOGIN_ERROR_PARAM = "error";
export const LOGIN_ERRORS = ["invalid", "locked", "unavailable"] as const;
export type LoginError = (typeof LOGIN_ERRORS)[number];

/** El error del login que llega en la URL, si es uno conocido. */
export function loginErrorFrom(value: string | null | undefined): LoginError | null {
  return (LOGIN_ERRORS as readonly string[]).includes(value ?? "") ? (value as LoginError) : null;
}

/**
 * Qué roles entran a cada sección (tabla de docs/06 §4). Cada página y acción del admin llama a
 * `requireRole(...ADMIN_PERMISSIONS.x)`; una sección nueva se agrega aquí.
 */
export const ADMIN_PERMISSIONS = {
  dashboard: ["admin", "editor", "ventas"],
  products: ["admin", "editor"],
  categories: ["admin", "editor"],
  stores: ["admin", "editor", "ventas"],
  kits: ["admin", "editor"],
  quotes: ["admin", "ventas"],
  inbox: ["admin", "ventas"],
  content: ["admin", "editor"],
  appearance: ["admin", "editor"],
  settings: ["admin"],
  redirects: ["admin"],
  sync: ["admin"],
  users: ["admin"],
  audit: ["admin"],
} as const satisfies Record<string, readonly Role[]>;

export type AdminArea = keyof typeof ADMIN_PERMISSIONS;

/** ¿El rol entra a la sección? */
export function canAccess(role: Role, area: AdminArea): boolean {
  return (ADMIN_PERMISSIONS[area] as readonly Role[]).includes(role);
}

/**
 * Ruta de vuelta tras el login: solo rutas del admin, sin dominio ni «//otro-sitio» ni barras
 * invertidas (evita usar el login para mandar a otro sitio). Si no sirve, el inicio del admin.
 */
export function safeAdminNext(value: string | null | undefined): string {
  if (!value || value.length > 300 || /[\\\s]/.test(value)) return ADMIN_HOME_PATH;
  try {
    // Ya normalizada: «/admin/../productos» es «/productos» y no pasa.
    const url = new URL(value, "http://bolik.invalid");
    const path = url.pathname;
    const inAdmin = path === ADMIN_HOME_PATH || path.startsWith(`${ADMIN_HOME_PATH}/`);
    if (url.origin !== "http://bolik.invalid" || !value.startsWith("/") || value.startsWith("//"))
      return ADMIN_HOME_PATH;
    if (!inAdmin || path === ADMIN_LOGIN_PATH || path.startsWith(`${ADMIN_LOGIN_PATH}/`))
      return ADMIN_HOME_PATH;
    return path + url.search;
  } catch {
    return ADMIN_HOME_PATH;
  }
}

/** URL del login para volver a `path` (y, si venció la sesión, con el aviso). */
export function loginUrl(path: string, reason?: "expired"): string {
  const params = new URLSearchParams({ [NEXT_PARAM]: safeAdminNext(path) });
  if (reason === "expired") params.set(EXPIRED_PARAM, "1");
  return `${ADMIN_LOGIN_PATH}?${params}`;
}

/**
 * Atributos de la cookie (docs/03 §8): httpOnly y sameSite=lax. `secure` en staging y producción;
 * en desarrollo y en la E2E (http://127.0.0.1) no, o el navegador no la guardaría. Path «/» y no
 * «/admin»: /styleguide también la lee en producción (BD-026). Las páginas públicas son estáticas
 * y no cambian con ella.
 */
export function adminCookieOptions(appEnv: AppEnv) {
  return {
    httpOnly: true,
    secure: appEnv !== "development",
    sameSite: "lax",
    path: "/",
  } as const;
}
