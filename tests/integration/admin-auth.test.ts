import bcrypt from "bcryptjs";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/server/db";

// Acceso al admin (BD-114, ADR-08) contra BolikDigital_Test: login con bloqueo, sesión en la
// cookie cifrada y guardias por rol. Las cookies y la redirección de Next se simulan.
type Cookie = { name: string; value: string; options?: Record<string, unknown> };

const state = vi.hoisted(() => ({
  jar: new Map<string, { name: string; value: string; options?: Record<string, unknown> }>(),
  ip: "10.0.0.7",
  path: "/admin/productos",
}));

vi.mock("@/env", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/env")>();
  return { env: { ...original.env, DATA_SOURCE: "db", APP_ENV: "development" } };
});
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-forwarded-for": state.ip, "x-bolik-path": state.path }),
  cookies: async () => ({
    get: (name: string) => state.jar.get(name),
    getAll: () => [...state.jar.values()],
    has: (name: string) => state.jar.has(name),
    set: (name: string, value: string, options?: Record<string, unknown>) => {
      // iron-session borra con maxAge 0 y valor vacío.
      if (options?.maxAge === 0 || value === "") state.jar.delete(name);
      else state.jar.set(name, { name, value, options });
    },
  }),
}));
class Redirect extends Error {
  constructor(readonly url: string) {
    super(`redirect ${url}`);
  }
}
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Redirect(url);
  },
}));

const { login, logout } = await import("@/features/admin/actions");
const { authenticate } = await import("@/server/auth/login");
const { checkRole, requireRole, hasAdminSession } = await import("@/server/auth/guards");
const { ADMIN_PERMISSIONS } = await import("@/lib/admin-access");

const PASSWORD = "contraseña-de-prueba-BD-114";
const PREFIX = "it-bd114-";
const email = (role: string) => `${PREFIX}${role}@bolik66.test`;
const ids: Record<string, number> = {};

async function cleanup() {
  const users = await db.adminUser.findMany({
    where: { email: { startsWith: PREFIX } },
    select: { id: true },
  });
  const userIds = users.map((u) => u.id);
  await db.auditLog.deleteMany({ where: { userId: { in: userIds } } });
  await db.adminUser.deleteMany({ where: { id: { in: userIds } } });
}

beforeAll(async () => {
  await cleanup();
  const passwordHash = await bcrypt.hash(PASSWORD, 4);
  for (const role of ["admin", "editor", "ventas"] as const) {
    const user = await db.adminUser.create({
      data: { email: email(role), name: `Prueba ${role}`, role, passwordHash },
    });
    ids[role] = user.id;
  }
});

afterAll(async () => {
  await cleanup();
  await db.$disconnect();
});

beforeEach(async () => {
  state.jar.clear();
  await db.adminUser.updateMany({
    where: { email: { startsWith: PREFIX } },
    data: { failedLogins: 0, lockedUntil: null, active: true },
  });
});

const form = (values: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
};

/** Corre la acción de login; devuelve la URL a la que redirigió (siempre redirige). */
async function submitLogin(values: Record<string, string>) {
  try {
    await login(form(values));
  } catch (error) {
    if (error instanceof Redirect) return { redirect: error.url };
    throw error;
  }
  throw new Error("el login no redirigió");
}

const loginError = (url: string | undefined) =>
  new URL(url ?? "", "http://x").searchParams.get("error");

describe("login (BD-114)", () => {
  it("con datos correctos abre la sesión y vuelve a la ruta pedida", async () => {
    const result = await submitLogin({
      email: email("editor").toUpperCase(),
      password: PASSWORD,
      siguiente: "/admin/productos?orden=nombre",
    });
    expect(result.redirect).toBe("/admin/productos?orden=nombre");
    const cookie = state.jar.get("bolik_admin") as Cookie;
    expect(cookie.value.length).toBeGreaterThan(20);
    expect(cookie.options).toMatchObject({ httpOnly: true, sameSite: "lax", path: "/" });
    // 8 h, menos el minuto que iron-session descuenta para que la cookie venza antes que el sello.
    expect(cookie.options?.maxAge).toBe(8 * 60 * 60 - 60);
    const user = await db.adminUser.findUniqueOrThrow({ where: { id: ids.editor } });
    expect(user.lastLoginAt).not.toBeNull();
    const audit = await db.auditLog.findFirst({
      where: { userId: ids.editor, action: "login" },
      orderBy: { id: "desc" },
    });
    expect(audit?.ipHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("un destino de otro sitio vuelve al inicio del admin", async () => {
    const result = await submitLogin({
      email: email("admin"),
      password: PASSWORD,
      siguiente: "//otro.com/admin",
    });
    expect(result.redirect).toBe("/admin");
  });

  it("el mismo error para un correo que no existe y una contraseña errónea", async () => {
    const unknown = await submitLogin({ email: `${PREFIX}nadie@bolik66.test`, password: PASSWORD });
    const wrong = await submitLogin({ email: email("admin"), password: "otra-contraseña-123" });
    expect(unknown.redirect).toBe("/admin/login?error=invalid&siguiente=%2Fadmin");
    expect(wrong.redirect).toBe(unknown.redirect);
    // El correo nunca va en la URL.
    expect(unknown.redirect).not.toContain("nadie");
    expect(state.jar.size).toBe(0);
  });

  it("campos vacíos o un correo mal escrito vuelven al login con el aviso", async () => {
    const result = await submitLogin({ email: "no-es-correo", password: "" });
    expect(loginError(result.redirect)).toBe("invalid");
  });

  it("al quinto intento fallido bloquea 15 minutos, aunque luego la contraseña sea correcta", async () => {
    const now = new Date();
    for (let i = 1; i <= 4; i++)
      expect(await authenticate(email("ventas"), "mala-contraseña-1", "hash", now)).toEqual({
        ok: false,
        error: "invalid",
      });
    expect(await authenticate(email("ventas"), "mala-contraseña-1", "hash", now)).toEqual({
      ok: false,
      error: "locked",
    });
    const user = await db.adminUser.findUniqueOrThrow({ where: { id: ids.ventas } });
    expect(user.lockedUntil!.getTime() - now.getTime()).toBe(15 * 60_000);
    expect(await db.auditLog.count({ where: { userId: ids.ventas, action: "lock" } })).toBe(1);
    // Con la contraseña correcta, sigue bloqueada mientras no pasen los 15 minutos.
    const blocked = await submitLogin({ email: email("ventas"), password: PASSWORD });
    expect(loginError(blocked.redirect)).toBe("locked");
    const later = new Date(now.getTime() + 16 * 60_000);
    expect((await authenticate(email("ventas"), PASSWORD, "hash", later)).ok).toBe(true);
    const unlocked = await db.adminUser.findUniqueOrThrow({ where: { id: ids.ventas } });
    expect(unlocked).toMatchObject({ failedLogins: 0, lockedUntil: null });
  });

  it("una ráfaga de 10 intentos fallidos a la vez bloquea una sola vez y cuenta solo hasta el quinto", async () => {
    const now = new Date();
    const results = await Promise.all(
      Array.from({ length: 10 }, () =>
        authenticate(email("admin"), "mala-contraseña-1", "hash", now),
      ),
    );
    const errors = results.map((r) => (r.ok ? "ok" : r.error));
    expect(errors.filter((e) => e === "invalid").length).toBeLessThanOrEqual(4);
    expect(errors.filter((e) => e === "locked").length).toBeGreaterThanOrEqual(6);
    const user = await db.adminUser.findUniqueOrThrow({ where: { id: ids.admin } });
    expect(user.lockedUntil!.getTime()).toBeGreaterThan(now.getTime());
    expect(user.failedLogins).toBe(0);
    expect(await db.auditLog.count({ where: { userId: ids.admin, action: "lock" } })).toBe(1);
    await db.auditLog.deleteMany({ where: { userId: ids.admin, action: "lock" } });
  });

  it("si otro intento la bloqueó mientras corría bcrypt, la contraseña correcta no entra ni la desbloquea", async () => {
    const { recordLoginSuccess } = await import("@/server/data/admin-users");
    const now = new Date();
    const lockedUntil = new Date(now.getTime() + 15 * 60_000);
    await db.adminUser.update({ where: { id: ids.admin }, data: { lockedUntil } });
    expect(await recordLoginSuccess(ids.admin!, "hash", now)).toBe(false);
    const user = await db.adminUser.findUniqueOrThrow({ where: { id: ids.admin } });
    expect(user.lockedUntil).toEqual(lockedUntil);
  });

  it("un correo que no existe también se bloquea al quinto intento (no delata qué correos hay)", async () => {
    const now = new Date();
    const ghost = `${PREFIX}fantasma-${Date.now()}@bolik66.test`;
    const outcomes = [];
    for (let i = 0; i < 5; i++)
      outcomes.push(await authenticate(ghost, "una-clave-x", "hash", now));
    expect(outcomes.map((o) => (o.ok ? "ok" : o.error))).toEqual([
      "invalid",
      "invalid",
      "invalid",
      "invalid",
      "locked",
    ]);
    expect(await authenticate(ghost, "otra-clave-y", "hash", now)).toEqual({
      ok: false,
      error: "locked",
    });
  });

  it("el hash de relleno tiene el mismo coste que los reales", async () => {
    const { DUMMY_HASH } = await import("@/server/auth/login");
    const { BCRYPT_COST } = await import("@/lib/admin-access");
    expect(bcrypt.getRounds(DUMMY_HASH)).toBe(BCRYPT_COST);
  });

  it("un usuario inactivo no entra", async () => {
    await db.adminUser.update({ where: { id: ids.editor }, data: { active: false } });
    expect(await authenticate(email("editor"), PASSWORD, "hash")).toEqual({
      ok: false,
      error: "invalid",
    });
  });
});

describe("guardias por rol (BD-114, docs/06 §4)", () => {
  async function signIn(role: "admin" | "editor" | "ventas") {
    const result = await submitLogin({ email: email(role), password: PASSWORD });
    expect(result.redirect).toBe("/admin");
  }

  it("sin cookie: requireRole manda al login con la ruta de vuelta", async () => {
    expect(await checkRole(ADMIN_PERMISSIONS.products)).toEqual({
      ok: false,
      error: "unauthenticated",
    });
    await expect(requireRole(...ADMIN_PERMISSIONS.products)).rejects.toMatchObject({
      url: "/admin/login?siguiente=%2Fadmin%2Fproductos",
    });
  });

  it("el rol ventas no puede editar productos; editor sí", async () => {
    await signIn("ventas");
    expect(await checkRole(ADMIN_PERMISSIONS.products)).toEqual({ ok: false, error: "forbidden" });
    await expect(requireRole(...ADMIN_PERMISSIONS.products)).rejects.toMatchObject({
      url: "/admin?sin-permiso=1",
    });
    expect((await checkRole(ADMIN_PERMISSIONS.quotes)).ok).toBe(true);

    state.jar.clear();
    await signIn("editor");
    const check = await checkRole(ADMIN_PERMISSIONS.products);
    expect(check.ok && check.user.role).toBe("editor");
  });

  it("el rol que manda es el de la base: un cambio de rol se aplica sin volver a entrar", async () => {
    await signIn("editor");
    await db.adminUser.update({ where: { id: ids.editor }, data: { role: "ventas" } });
    try {
      expect(await checkRole(ADMIN_PERMISSIONS.products)).toEqual({
        ok: false,
        error: "forbidden",
      });
    } finally {
      await db.adminUser.update({ where: { id: ids.editor }, data: { role: "editor" } });
    }
  });

  it("si desactivan al usuario o la cookie está dañada, la sesión cuenta como vencida", async () => {
    await signIn("admin");
    expect(await hasAdminSession()).toBe(true);
    await db.adminUser.update({ where: { id: ids.admin }, data: { active: false } });
    expect(await checkRole(ADMIN_PERMISSIONS.dashboard)).toEqual({ ok: false, error: "expired" });
    await expect(requireRole(...ADMIN_PERMISSIONS.dashboard)).rejects.toMatchObject({
      url: "/admin/login?siguiente=%2Fadmin%2Fproductos&vencida=1",
    });

    state.jar.set("bolik_admin", { name: "bolik_admin", value: "Fe26.2*dañada" });
    expect(await checkRole(ADMIN_PERMISSIONS.dashboard)).toEqual({ ok: false, error: "expired" });
  });

  it("cerrar sesión borra la cookie y vuelve al login con el aviso", async () => {
    await signIn("admin");
    await expect(logout()).rejects.toMatchObject({ url: "/admin/login?salida=1" });
    expect(state.jar.has("bolik_admin")).toBe(false);
    expect(await hasAdminSession()).toBe(false);
  });
});
