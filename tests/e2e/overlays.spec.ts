import { expect, expectNoA11yViolations, test } from "./helpers";

// Overlays y navegación (BD-025): Escape cierra y el foco vuelve al disparador; con movimiento
// reducido no hay desplazamiento; pestañas y acordeón muestran su contenido sin JavaScript.
test.describe("overlays", () => {
  const TRIGGERS = ["Sheet (auto)", "Sheet derecha", "Dialog", "Popover"];

  for (const name of TRIGGERS) {
    test(`${name}: Escape cierra y el foco vuelve al botón`, async ({ page }) => {
      await page.goto("/styleguide/componentes");
      const trigger = page.getByRole("button", { name, exact: true });
      await trigger.click();
      const overlay =
        name === "Popover" ? page.locator(".popover-content") : page.getByRole("dialog");
      await expect(overlay).toBeVisible();
      if (name !== "Popover") await expectNoA11yViolations(page);
      await page.keyboard.press("Escape");
      await expect(overlay).toHaveCount(0);
      await expect(trigger).toBeFocused();
    });
  }

  test("el sheet auto va abajo en móvil y a la derecha en escritorio", async ({
    page,
  }, testInfo) => {
    await page.goto("/styleguide/componentes");
    await page.getByRole("button", { name: "Sheet (auto)" }).click();
    const sheet = page.getByRole("dialog");
    const viewport = page.viewportSize()!;
    await expect
      .poll(async () => {
        const box = (await sheet.boundingBox())!;
        return testInfo.project.name === "movil"
          ? Math.round(box.y + box.height) === viewport.height &&
              Math.round(box.width) === viewport.width
          : Math.round(box.x + box.width) === viewport.width &&
              Math.round(box.height) === viewport.height;
      })
      .toBe(true);
  });

  test("con movimiento reducido el sheet solo cambia de opacidad", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/styleguide/componentes");
    await page.getByRole("button", { name: "Sheet derecha" }).click();
    const sheet = page.getByRole("dialog");
    await expect(sheet).toBeVisible();
    expect(await sheet.evaluate((el) => getComputedStyle(el).animationName)).toBe("fade-in");
  });

  test("pestañas: teclado en escritorio, acordeón en móvil", async ({ page }, testInfo) => {
    await page.goto("/styleguide/componentes");
    if (testInfo.project.name === "movil") {
      const header = page.getByRole("button", { name: "Medidas" });
      const panel = page.locator(
        `#${await header.getAttribute("aria-controls")}`.replaceAll(":", "\\:"),
      );
      await expect(panel).toBeHidden();
      await header.click();
      await expect(header).toHaveAttribute("aria-expanded", "true");
      await expect(panel).toBeVisible();
      await expect(panel).toHaveAttribute("role", "region");
    } else {
      const first = page.getByRole("tab", { name: "Especificaciones" });
      await first.focus();
      await page.keyboard.press("ArrowRight");
      const medidas = page.getByRole("tab", { name: "Medidas" });
      await expect(medidas).toBeFocused();
      await expect(medidas).toHaveAttribute("aria-selected", "true");
      await expect(page.getByRole("tabpanel")).toHaveCount(1);
      await expect(page.getByRole("tabpanel")).toBeVisible();
    }
  });

  test("sin JavaScript se ven todos los paneles y las respuestas están en el HTML", async ({
    browser,
  }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto("/styleguide/componentes");
    const panels = page.locator("[data-tab-panel]");
    await expect(panels).toHaveCount(4);
    for (const panel of await panels.all()) await expect(panel).toBeVisible();
    // El acordeón cerrado igual trae las respuestas en el HTML (BD-110, docs/11 §1).
    const details = page.locator("details.accordion-item");
    expect(await details.count()).toBeGreaterThan(0);
    const answer = await details.first().locator("div").textContent();
    expect(answer?.trim()).not.toBe("");
    await details.first().locator("summary").click();
    await expect(details.first()).toHaveAttribute("open", "");
    await context.close();
  });
});
