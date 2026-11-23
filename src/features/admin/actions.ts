"use server";

import type { Route } from "next";
import { redirect } from "next/navigation";
import { safeParse } from "zod/mini";
import { env } from "@/env";
import {
  ADMIN_LOGIN_PATH,
  LOGGED_OUT_PARAM,
  LOGIN_ERROR_PARAM,
  LOGIN_MIN_RESPONSE_MS,
  NEXT_PARAM,
  safeAdminNext,
  type LoginError,
} from "@/lib/admin-access";
import { authenticate } from "@/server/auth/login";
import { createAdminSession, destroyAdminSession } from "@/server/auth/session";
import { logError } from "@/server/log";
import { requestIp } from "@/server/request-ip";
import { loginSchema } from "./schema";

/** De vuelta al login con el error y la ruta pedida; nunca el correo (no va en la URL). */
function backToLogin(error: LoginError, next: string): never {
  const params = new URLSearchParams({ [LOGIN_ERROR_PARAM]: error, [NEXT_PARAM]: next });
  redirect(`${ADMIN_LOGIN_PATH}?${params}` as Route);
}

/**
 * Inicia sesión (BD-114, docs/03 §8). El formulario es HTML sin isla de cliente propia (un componente
 * cliente en el admin parte el JS común del sitio; docs/12 §2): el navegador pide los campos
 * (`required`, `type="email"`) y esta acción valida con Zod, comprueba con bcrypt y el bloqueo
 * tras 5 intentos (server/auth/login.ts), abre la sesión de 8 h y vuelve a la ruta pedida (solo del
 * admin). Con un error vuelve al login con el aviso. No usa requireRole: es la única acción del
 * admin sin sesión.
 */
export async function login(form: FormData): Promise<void> {
  const rawNext = form.get(NEXT_PARAM);
  const next = safeAdminNext(typeof rawNext === "string" ? rawNext : null);
  // Un correo mal escrito o un campo vacío (sin la validación del navegador) no puede coincidir.
  const parsed = safeParse(loginSchema, {
    email: form.get("email"),
    password: form.get("password"),
  });
  if (!parsed.success) backToLogin("invalid", next);
  if (env.DATA_SOURCE !== "db") backToLogin("unavailable", next);

  const started = performance.now();
  let outcome;
  try {
    const ip = await requestIp();
    outcome = await authenticate(parsed.data.email, parsed.data.password, ip.hash, new Date(), {
      limitByIp: ip.visitor,
    });
  } catch (error) {
    logError(error, { action: "admin.login" });
    backToLogin("unavailable", next);
  }
  // Mismo tiempo para un correo registrado y uno que no existe (server/auth/login.ts).
  const wait = LOGIN_MIN_RESPONSE_MS - (performance.now() - started);
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
  if (!outcome.ok) backToLogin(outcome.error, next);

  await createAdminSession({ userId: outcome.user.id, role: outcome.user.role });
  redirect(next as Route);
}

/** Cierra la sesión (BD-114) y vuelve al login con el aviso «Cerraste sesión». */
export async function logout(): Promise<void> {
  await destroyAdminSession();
  redirect(`${ADMIN_LOGIN_PATH}?${LOGGED_OUT_PARAM}=1` as Route);
}
