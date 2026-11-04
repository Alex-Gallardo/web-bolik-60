import { collectConsoleErrors, expect, expectNoA11yViolations, test } from "./helpers";

// Vitrina de componentes (BD-021): todas las variantes pasan axe (contraste incluido), el foco se
// ve con el teclado y el estado de carga se anuncia sin mover el botón ni perder el foco.
test.describe("componentes", () => {
  test("los botones pasan axe y tienen foco visible", async ({ page }) => {
    const errors = collectConsoleErrors(page);
    const response = await page.goto("/styleguide/componentes");
    expect(response?.status()).toBe(200);
    expect(response?.headers()["x-robots-tag"]).toContain("noindex");
    await expectNoA11yViolations(page);

    const cotizar = page.getByRole("button", { name: "Cotizar", exact: true });
    await cotizar.focus();
    await expect(cotizar).toBeFocused();
    // El anillo de globals.css (3 px), no el del navegador.
    const outline = await cotizar.evaluate((el) => {
      const style = getComputedStyle(el);
      return { style: style.outlineStyle, width: style.outlineWidth };
    });
    expect(outline).toEqual({ style: "solid", width: "3px" });
    expect(errors, "errores en la consola").toEqual([]);
  });

  test("cargando: se bloquea, anuncia «Enviando…», no cambia de ancho ni pierde el foco", async ({
    page,
  }) => {
    const errors = collectConsoleErrors(page);
    await page.goto("/styleguide/componentes");
    const demo = page.getByRole("button", { name: "Probar envío" });
    const before = await demo.boundingBox();

    await demo.focus();
    await page.keyboard.press("Enter");
    await expect(demo).toHaveAttribute("aria-busy", "true");
    await expect(demo).toHaveAttribute("aria-disabled", "true");
    await expect(demo).toBeFocused();
    // La región de aviso del demo es la que sigue al botón.
    const status = demo.locator("xpath=following-sibling::*[@role='status'][1]");
    await expect(status).toHaveText("Enviando…");

    const during = await demo.boundingBox();
    expect(during?.width).toBe(before?.width);

    await expect(demo).not.toHaveAttribute("aria-busy", { timeout: 5000 });
    await expect(status).toHaveText("");
    expect(errors, "errores en la consola").toEqual([]);
  });

  test("los 9 fondos de sección se ven con su tono", async ({ page }) => {
    await page.goto("/styleguide/componentes");
    const expected = {
      paper: "light",
      soft: "light",
      dots: "light",
      grid: "light",
      lines: "light",
      ink: "light",
      brand: "dark",
      navy: "dark",
      sun: "light",
    };
    for (const [bg, tone] of Object.entries(expected)) {
      const section = page.getByTestId(`fondo-${bg}`);
      await expect(section).toBeVisible();
      await expect(section).toHaveAttribute("data-bg", bg);
      await expect(section).toHaveAttribute("data-tone", tone);
    }

    // Cada fondo tiene su CSS (color o patrón distintos entre sí).
    const looks = await page.evaluate(() =>
      ["paper", "dots", "navy", "brand"].map((bg) => {
        const style = getComputedStyle(document.querySelector(`[data-testid="fondo-${bg}"]`)!);
        return `${style.backgroundColor}|${style.backgroundImage}`;
      }),
    );
    expect(new Set(looks).size).toBe(4);

    // Ningún fondo (ni el trazo de "ink") provoca scroll horizontal.
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBe(0);
  });

  test("con movimiento reducido el spinner no gira", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/styleguide/componentes");
    const spinner = page.locator("svg.spin").first();
    await expect(spinner).toBeVisible();
    expect(await spinner.evaluate((el) => getComputedStyle(el).animationName)).toBe("none");
  });
});
