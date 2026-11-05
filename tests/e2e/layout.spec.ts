import { rootMetadata } from "../../src/features/seo/metadata";
import { collectConsoleErrors, expect, expectNoA11yViolations, test } from "./helpers";

const DEFAULT_TITLE = (rootMetadata.title as { default: string }).default;

// Layout raíz (BD-040, docs/06 §2): español de Guatemala, metadatos raíz, un solo <main> y el
// enlace «Saltar al contenido» como primer paso del teclado.
test.describe("layout raíz", () => {
  test("la home: es-GT, título por defecto, un solo <main> y axe", async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("lang", "es-GT");
    await expect(page).toHaveTitle(DEFAULT_TITLE);
    await expect(page.locator("main")).toHaveCount(1);
    await expect(page.locator("main#contenido")).toHaveCount(1);
    await expectNoA11yViolations(page);
    expect(errors, "errores en la consola").toEqual([]);
  });

  test("las páginas internas usan la plantilla «%s | Bolik» y un solo <main>", async ({ page }) => {
    await page.goto("/styleguide");
    await expect(page).toHaveTitle("Styleguide | Bolik");
    await expect(page.locator("main")).toHaveCount(1);
  });

  test("la pantalla de error queda dentro del único <main>", async ({ page }) => {
    await page.goto("/styleguide");
    await page.getByRole("button", { name: "Provocar un error" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator("main")).toHaveCount(1);
    await expect(page.locator("main#contenido").getByRole("heading", { level: 1 })).toHaveCount(1);
  });

  test("«Saltar al contenido» es lo primero con Tab, se ve y lleva al <main>", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "escritorio", "navegación con teclado físico");
    await page.goto("/styleguide");
    const skip = page.getByRole("link", { name: "Saltar al contenido" });
    // Oculto hasta recibir el foco.
    expect((await skip.boundingBox())?.width ?? 0).toBeLessThanOrEqual(1);
    await page.keyboard.press("Tab");
    await expect(skip).toBeFocused();
    expect((await skip.boundingBox())!.width).toBeGreaterThan(40);
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/#contenido$/);
    await expect(page.locator("main#contenido")).toBeFocused();
    // El siguiente Tab sigue desde el contenido, no vuelve al inicio.
    await page.keyboard.press("Tab");
    expect(
      await page.evaluate(() => document.querySelector("main")!.contains(document.activeElement)),
    ).toBe(true);
  });
});
