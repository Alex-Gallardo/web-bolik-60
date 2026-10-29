import "server-only";
import { cookies } from "next/headers";
import { getIronSession, type SessionOptions } from "iron-session";
import { env } from "@/env";
import type { Role } from "@/lib/constants";

/** Sesión del admin (ADR-08): cookie cifrada, sin tabla de sesiones. */
export type AdminSession = {
  userId?: number;
  role?: Role;
  name?: string;
  /** epoch ms; además del maxAge de la cookie, se valida en el servidor */
  expiresAt?: number;
};

export const SESSION_COOKIE = "bolik_admin"; // el mismo nombre que usa proxy.ts
const EIGHT_HOURS = 8 * 60 * 60;

const options: SessionOptions = {
  password: env.SESSION_SECRET,
  cookieName: SESSION_COOKIE,
  ttl: EIGHT_HOURS,
  cookieOptions: {
    httpOnly: true,
    secure: env.APP_ENV !== "development",
    sameSite: "lax",
    path: "/",
  },
};

export async function getSession() {
  return getIronSession<AdminSession>(await cookies(), options);
}

export async function startSession(user: { id: number; role: Role; name: string }) {
  const session = await getSession();
  session.userId = user.id;
  session.role = user.role;
  session.name = user.name;
  session.expiresAt = Date.now() + EIGHT_HOURS * 1000;
  await session.save();
}

export async function endSession() {
  const session = await getSession();
  session.destroy();
}
