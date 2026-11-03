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
    for (const path of ["/styleguide/tokens", "/admin"]) {
      const response = await request.get(path);
      expect(response.headers()["x-robots-tag"], path).toContain("noindex");
    }
  });
});
