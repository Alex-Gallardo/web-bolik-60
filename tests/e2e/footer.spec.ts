import { collectConsoleErrors, expect, expectNoA11yViolations, test } from "./helpers";

// Pie y flotantes (BD-042, docs/06 §2): NAP con tel:, enlaces a cada categoría, la barra móvil no
// tapa el final de la página y se oculta con el teclado o con un sheet abierto; «Volver arriba».
test.describe("pie y flotantes", () => {
  test("pie con NAP, teléfono tel: y enlaces; sin errores y pasa axe", async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await page.goto("/");
    const footer = page.getByRole("contentinfo");
    await footer.scrollIntoViewIfNeeded();
    await expect(footer.locator("address")).toContainText("Industrias Bolik, S.A.");
    await expect(footer.locator("address")).toContainText("6a. Avenida 6-31, zona 2");
    await expect(footer.getByRole("link", { name: "Llamar al +502 6628 2600" })).toHaveAttribute(
      "href",
      "tel:+50266282600",
    );
    await expect(footer.getByRole("link", { name: "Bolígrafos" })).toHaveAttribute(
      "href",
      "/productos/boligrafos",
    );
    await expect(footer.getByRole("link", { name: "Privacidad" })).toBeVisible();
    await expect(footer).toContainText(/© \d{4} Bolik\. Hecho en Guatemala\./);
    await expectNoA11yViolations(page);
    expect(errors, "errores en la consola").toEqual([]);
  });

  test("los flotantes no tapan el final de la página", async ({ page }, testInfo) => {
    await page.goto("/");
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    const lastRow = page.getByRole("contentinfo").getByRole("link", { name: "Volver arriba" });
    const rowBox = (await lastRow.boundingBox())!;
    const bar = page.getByRole("navigation", { name: "Acciones rápidas" });
    if (testInfo.project.name === "escritorio") {
      await expect(bar).toBeHidden();
      return;
    }
    await expect(bar).toBeVisible();
    await expect(bar.getByRole("link", { name: "Cotizar" })).toBeVisible();
    const barBox = (await bar.boundingBox())!;
    expect(rowBox.y + rowBox.height, "la última fila queda arriba de la barra").toBeLessThanOrEqual(
      barBox.y,
    );
    // «Volver arriba» flotante tampoco tapa la última fila.
    const floatingTop = page.locator(".floating-top");
    const topBox = await floatingTop.boundingBox();
    if (topBox && (await floatingTop.isVisible()))
      expect(rowBox.y + rowBox.height).toBeLessThanOrEqual(topBox.y);
  });

  test("la barra móvil se oculta con el teclado abierto y con el menú", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name === "escritorio", "la barra es solo de móvil");
    await page.goto("/styleguide");
    // Por clase y no por rol: con un sheet abierto Radix pone aria-hidden fuera de él y el rol ya
    // no se encuentra aunque la barra se vea.
    const bar = page.locator(".mobile-bar");
    await expect(bar).toHaveCSS("visibility", "visible");
    // Una casilla no abre teclado: la barra sigue.
    const checkbox = page.getByRole("checkbox").first();
    await checkbox.focus();
    await expect(checkbox).toBeFocused();
    await expect(bar).toHaveCSS("visibility", "visible");
    // Un campo de texto sí.
    const textbox = page.getByRole("textbox").first();
    await textbox.focus();
    await expect(bar).toHaveCSS("visibility", "hidden");
    await textbox.blur();
    await expect(bar).toHaveCSS("visibility", "visible");
    await page.getByRole("button", { name: "Abrir menú" }).click();
    await expect(page.getByRole("dialog", { name: "Menú" })).toBeVisible();
    await expect(bar).toHaveCSS("visibility", "hidden");
  });

  test("«Volver arriba» aparece al bajar y lleva al inicio", async ({ page }) => {
    await page.goto("/styleguide");
    await page.waitForLoadState("networkidle");
    const button = page.locator(".floating-top");
    await expect(button).toBeHidden();
    await page.evaluate(() => window.scrollTo(0, window.innerHeight * 3));
    await expect(page.locator("html")).toHaveAttribute("data-scrolled-far", "");
    await expect(button).toBeVisible();
    await button.click();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(10);
    await expect(button).toBeHidden();
    // El destino es el <body>: el siguiente Tab empieza desde arriba.
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Saltar al contenido" })).toBeFocused();
  });
});
