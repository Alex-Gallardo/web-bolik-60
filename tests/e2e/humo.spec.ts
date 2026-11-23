import { collectConsoleErrors, expect, expectNoA11yViolations, test } from "./helpers";

// Prueba de humo (BD-013): el build de producción arranca, la home se ve sin errores y las
// páginas de utilidad llevan noindex. Corre también en iPhone (@critico).
test.describe("humo @critico", () => {
  test("la home carga sin errores y pasa axe", async ({ page }) => {
    const errors = collectConsoleErrors(page);
    const response = await page.goto("/");
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expectNoA11yViolations(page);
    expect(errors, "errores en la consola").toEqual([]);
  });

  // Revisa cabeceras, no la página: basta con un proyecto.
  test("el styleguide y el admin llevan noindex", async ({ request }, testInfo) => {
    test.skip(testInfo.project.name !== "escritorio", "solo cabeceras HTTP");
    // /admin/login: el resto del admin redirige ahí sin sesión (BD-114).
    for (const path of ["/styleguide", "/admin/login"]) {
      const response = await request.get(path);
      expect(response.headers()["x-robots-tag"], path).toContain("noindex");
    }
  });

  // BD-047: las cabeceras de documento solo en documentos; nosniff en todo (docs/15 §6).
  test("la CSP va en las páginas y no en los estáticos", async ({ request }, testInfo) => {
    test.skip(testInfo.project.name !== "escritorio", "solo cabeceras HTTP");
    const csp = (headers: Record<string, string>) =>
      headers["content-security-policy"] ?? headers["content-security-policy-report-only"];
    const DOCUMENT_ONLY = ["permissions-policy", "x-frame-options", "cross-origin-opener-policy"];

    // El admin es donde más importan X-Frame-Options y COOP; /api también es «documento».
    const documents = ["/", "/productos", "/no-existe-esta-pagina", "/admin/login"];
    let html = "";
    for (const path of [...documents, "/api/search-index"]) {
      const response = await request.get(path);
      if (path === "/") html = await response.text();
      const headers = response.headers();
      expect(csp(headers), path).toContain("default-src 'self'");
      for (const name of DOCUMENT_ONLY) expect(headers[name], `${path} ${name}`).toBeTruthy();
      expect(headers["x-content-type-options"], path).toBe("nosniff");
    }

    // Un .js de la home y un póster del hero (la semilla de la E2E siempre los trae).
    const script = html.match(/\/_next\/static\/chunks\/[\w.-]+\.js/)?.[0];
    const media = html.match(/\/media\/hero\/[\w./-]+\.webp/)?.[0];
    expect(script, "la home enlaza un .js").toBeTruthy();
    expect(media, "la home enlaza un póster del hero (semilla con medios)").toBeTruthy();

    // Un estático que no existe responde texto plano, no una página HTML sin CSP.
    const missing = await request.get("/_next/static/chunks/no-existe.js");
    expect(missing.status()).toBe(404);
    expect(missing.headers()["content-type"] ?? "").not.toContain("text/html");

    for (const path of [script!, media!]) {
      const response = await request.get(path);
      expect(response.status(), path).toBe(200);
      const headers = response.headers();
      expect(csp(headers), path).toBeUndefined();
      for (const name of DOCUMENT_ONLY) expect(headers[name], `${path} ${name}`).toBeUndefined();
      expect(headers["x-content-type-options"], path).toBe("nosniff");
    }
  });
});
