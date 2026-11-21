import { describe, expect, it } from "vitest";
import { ROLES } from "./constants";
import {
  ADMIN_PERMISSIONS,
  adminCookieOptions,
  canAccess,
  loginUrl,
  safeAdminNext,
} from "./admin-access";

describe("permisos del admin (BD-114, docs/06 §4)", () => {
  it("el rol ventas no puede editar productos; admin y editor sí", () => {
    expect(canAccess("ventas", "products")).toBe(false);
    expect(canAccess("editor", "products")).toBe(true);
    expect(canAccess("admin", "products")).toBe(true);
  });

  it("ventas ve cotizaciones y tiendas; editor no ve cotizaciones; solo admin ve usuarios", () => {
    expect(canAccess("ventas", "quotes")).toBe(true);
    expect(canAccess("ventas", "stores")).toBe(true);
    expect(canAccess("editor", "quotes")).toBe(false);
    expect(canAccess("editor", "users")).toBe(false);
    expect(canAccess("ventas", "settings")).toBe(false);
  });

  it("todos entran al dashboard y admin entra a todo", () => {
    for (const role of ROLES) expect(canAccess(role, "dashboard")).toBe(true);
    for (const area of Object.keys(ADMIN_PERMISSIONS) as (keyof typeof ADMIN_PERMISSIONS)[])
      expect(canAccess("admin", area), area).toBe(true);
  });
});

describe("ruta de vuelta tras el login", () => {
  it.each([
    ["/admin", "/admin"],
    ["/admin/productos", "/admin/productos"],
    ["/admin/cotizaciones?estado=nueva", "/admin/cotizaciones?estado=nueva"],
  ])("%s → %s", (value, expected) => {
    expect(safeAdminNext(value)).toBe(expected);
  });

  it.each([
    null,
    "",
    "https://otro.com/admin",
    "//otro.com/admin",
    "/\\otro.com",
    "/admin\\..\\..",
    "/productos",
    "/administrador",
    "/admin/login",
    "/admin/../productos",
    "/admin /x",
  ])("«%s» vuelve al inicio del admin", (value) => {
    expect(safeAdminNext(value)).toBe("/admin");
  });

  it("loginUrl lleva la ruta y, si venció, el aviso", () => {
    expect(loginUrl("/admin/productos")).toBe("/admin/login?siguiente=%2Fadmin%2Fproductos");
    expect(loginUrl("/admin", "expired")).toBe("/admin/login?siguiente=%2Fadmin&vencida=1");
  });
});

describe("cookie bolik_admin (docs/03 §8)", () => {
  it("httpOnly y sameSite=lax en todo el sitio (styleguide); secure fuera de desarrollo", () => {
    for (const env of ["staging", "production"] as const)
      expect(adminCookieOptions(env)).toEqual({
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/",
      });
    expect(adminCookieOptions("development").secure).toBe(false);
  });
});
