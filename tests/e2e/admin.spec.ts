import { collectConsoleErrors, expect, expectNoA11yViolations, test } from "./helpers";

// Acceso al admin (BD-114). La E2E corre sin base de datos (DATA_SOURCE=fixtures en la CI): aquí
// se prueba lo que no la necesita. Entrar, el bloqueo y los roles están en
// tests/integration/admin-auth.test.ts (contra SQL Server).
test.describe("acceso al admin (BD-114)", () => {
  test("sin sesión, /admin/* redirige al login con la ruta de vuelta", async ({
    request,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "escritorio", "solo cabeceras HTTP");
    for (const [path, next] of [
      ["/admin", "/admin"],
      ["/admin/productos?orden=nombre", "/admin/productos?orden=nombre"],
    ]) {
      const response = await request.get(path!, { maxRedirects: 0 });
      expect(response.status(), path).toBe(307);
      const location = new URL(response.headers().location!, "http://x");
      expect(location.pathname, path).toBe("/admin/login");
      expect(location.searchParams.get("siguiente"), path).toBe(next);
      expect(response.headers()["x-robots-tag"], path).toContain("noindex");
    }
    // Una cookie inventada pasa el proxy, pero la página la rechaza en el servidor: con Cache
    // Components la respuesta ya empezó (200) y la redirección llega en el HTML, sin el contenido.
    const forged = await request.get("/admin", {
      maxRedirects: 0,
      headers: { cookie: "bolik_admin=Fe26.2*inventada" },
    });
    const html = await forged.text();
    expect(html).toContain("/admin/login?siguiente=%2Fadmin");
    expect(html).not.toContain("Hola,");
    expect(html).not.toContain("Cerrar sesión");
  });

  test("el login: noindex, un h1, campos con etiqueta y pasa axe", async ({ page }) => {
    const errors = collectConsoleErrors(page);
    const response = await page.goto("/admin/login");
    expect(response?.status()).toBe(200);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    await expect(page).toHaveTitle("Panel de Bolik");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Panel de Bolik");
    await expect(page.getByLabel("Correo")).toHaveAttribute("type", "email");
    await expect(page.getByLabel("Contraseña")).toHaveAttribute("type", "password");
    await expectNoA11yViolations(page);
    expect(errors, "errores en la consola").toEqual([]);
  });

  // En la CI (sin base) responde «no disponible»; con una base local, «no coinciden» (el correo
  // de la prueba no existe). El formulario es HTML sin JS de cliente: vuelve al login con el aviso,
  // sin el correo en la URL ni en el campo, y conserva la ruta de vuelta. (Sin JS no se ve: el admin
  // va dentro de un <Suspense> porque lee la cookie, y el contenido llega oculto hasta que corre.)
  test("un intento fallido vuelve al login con el aviso", async ({ page }) => {
    await page.goto("/admin/login?siguiente=%2Fadmin%2Fproductos");
    await page.getByLabel("Correo").fill("e2e-nadie@bolik66.test");
    await page.getByLabel("Contraseña").fill("una-contraseña-larga");
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page.getByRole("alert").filter({ hasText: /panel|correo/ })).toContainText(
      /El panel no está disponible en este momento|El correo o la contraseña no coinciden/,
    );
    const url = new URL(page.url());
    expect(url.pathname).toBe("/admin/login");
    expect(url.searchParams.get("siguiente")).toBe("/admin/productos");
    expect(url.search).not.toContain("nadie");
    await expect(page.getByLabel("Contraseña")).toHaveValue("");
  });

  test("avisa si la sesión venció o se cerró", async ({ page }) => {
    await page.goto("/admin/login?vencida=1");
    await expect(page.getByRole("status").filter({ hasText: "Tu sesión terminó" })).toBeVisible();
    await page.goto("/admin/login?salida=1");
    await expect(page.getByRole("status").filter({ hasText: "Cerraste sesión" })).toBeVisible();
  });
});

// Camino feliz (definición de terminado §6): entrar, ver /admin y cerrar sesión necesita una base
// con un usuario. La E2E de la CI corre sin base: queda para BD-131 (mientras tanto, la
// integración lo cubre en tests/integration/admin-auth.test.ts).
test.fixme("entrar con un usuario real, ver el inicio del admin y cerrar sesión (BD-131)", () => {});
