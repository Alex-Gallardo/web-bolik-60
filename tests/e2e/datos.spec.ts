import { collectConsoleErrors, expect, expectNoA11yViolations, test } from "./helpers";

// Vitrina de datos (BD-037): el build prerenderiza lo que sirve src/server/data con la fuente de
// ejemplo, sin SQL Server.
test.describe("datos de ejemplo", () => {
  test("/styleguide/datos muestra el catálogo y pasa axe", async ({ page }) => {
    const errors = collectConsoleErrors(page);
    const response = await page.goto("/styleguide/datos");
    expect(response?.status()).toBe(200);
    expect(response?.headers()["x-robots-tag"]).toContain("noindex");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Datos del sitio");
    await expect(page.getByRole("cell", { name: "PT00058", exact: true })).toBeVisible();
    await expect(page.getByRole("cell", { name: "759364663092" })).toBeVisible();
    await expectNoA11yViolations(page);
    expect(errors, "errores en la consola").toEqual([]);
  });
});
