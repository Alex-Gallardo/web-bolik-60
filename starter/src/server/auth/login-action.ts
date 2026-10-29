"use server";
import "server-only";
import { z } from "zod";
import { redirect } from "next/navigation";
import { db } from "@/server/db";
import { startSession, endSession } from "./session";
import { verifyPassword, burnTime, MAX_FAILED_LOGINS, LOCK_MINUTES } from "./password";
import { feedback } from "@/content/feedback";
import type { Role } from "@/lib/constants";

const schema = z.object({
  email: z.email().transform((v) => v.toLowerCase().trim()),
  password: z.string().min(1),
  next: z.string().startsWith("/admin").default("/admin"),
});

export type LoginState = { error?: string };

/** Mensaje genérico ante usuario o contraseña incorrectos (no revela si el correo existe). */
const WRONG = "Correo o contraseña incorrectos";

export async function loginAction(_prev: LoginState, form: FormData): Promise<LoginState> {
  const parsed = schema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: WRONG };
  const { email, password, next } = parsed.data;

  const user = await db.adminUser.findUnique({ where: { email } });
  if (!user || !user.active) {
    await burnTime(password); // tiempo constante
    return { error: WRONG };
  }
  if (user.lockedUntil && user.lockedUntil > new Date()) return { error: feedback.admin.loginLocked.body };

  if (!(await verifyPassword(password, user.passwordHash))) {
    const failed = user.failedLogins + 1;
    await db.adminUser.update({
      where: { id: user.id },
      data: {
        failedLogins: failed >= MAX_FAILED_LOGINS ? 0 : failed,
        lockedUntil: failed >= MAX_FAILED_LOGINS ? new Date(Date.now() + LOCK_MINUTES * 60_000) : null,
      },
    });
    return { error: failed >= MAX_FAILED_LOGINS ? feedback.admin.loginLocked.body : WRONG };
  }

  await db.adminUser.update({ where: { id: user.id }, data: { failedLogins: 0, lockedUntil: null, lastLoginAt: new Date() } });
  await db.auditLog.create({ data: { userId: user.id, action: "login", entity: "AdminUser", entityId: String(user.id) } });
  await startSession({ id: user.id, role: user.role as Role, name: user.name });
  redirect(next);
}

export async function logoutAction() {
  await endSession();
  redirect("/admin/login");
}
