import { collectConsoleErrors, expect, expectNoA11yViolations, test } from "./helpers";

// Header y menú móvil (BD-041, docs/06 §2): sin CLS al compactarse, el menú se cierra al navegar
// y devuelve el foco, el Sheet se descarga al primer toque y el contador lee la cotización.
test.describe("header", () => {
  test("se ve, sin errores de consola y pasa axe", async ({ page }, testInfo) => {
    const errors = collectConsoleErrors(page);
    await page.goto("/");
    const header = page.locator("header.site-header");
    await expect(header).toBeVisible();
    await expect(header.getByRole("link", { name: "Bolik, inicio" })).toBeVisible();
    await expect(header.getByRole("link", { name: "Mi cotización" })).toBeVisible();
    if (testInfo.project.name === "escritorio")
      await expect(header.getByRole("navigation", { name: "Menú principal" })).toBeVisible();
    else await expect(header.getByRole("button", { name: "Abrir menú" })).toBeVisible();
    await expectNoA11yViolations(page);
    expect(errors, "errores en la consola").toEqual([]);
  });

  test("se compacta al bajar sin mover el diseño (CLS 0)", async ({ page }) => {
    await page.addInitScript(() => {
      const w = window as unknown as { __cls: number };
      w.__cls = 0;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as unknown as { value: number }[])
          w.__cls += entry.value;
      }).observe({ type: "layout-shift", buffered: true });
    });
    await page.goto("/styleguide");
    await page.waitForLoadState("networkidle");
    const before = await page.evaluate(() => (window as unknown as { __cls: number }).__cls);
    const height = await page
      .locator("header.site-header")
      .evaluate((el) => (el as HTMLElement).offsetHeight);
    await page.evaluate(() => window.scrollTo(0, 600));
    await expect(page.locator("html")).toHaveAttribute("data-scrolled", "");
    await expect
      .poll(() =>
        page
          .locator("header.site-header")
          .evaluate((el) => getComputedStyle(el, "::after").opacity),
      )
      .toBe("1");
    // La altura que ocupa no cambia: solo cambia lo que se ve (transform).
    expect(
      await page.locator("header.site-header").evaluate((el) => (el as HTMLElement).offsetHeight),
    ).toBe(height);
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(page.locator("html")).not.toHaveAttribute("data-scrolled");
    const after = await page.evaluate(() => (window as unknown as { __cls: number }).__cls);
    expect(after - before).toBe(0);
  });

  test("Productos (escritorio): abre con el teclado, Escape cierra y devuelve el foco", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "escritorio", "menú de escritorio");
    await page.goto("/");
    const summary = page.locator("header summary");
    await summary.focus();
    await page.keyboard.press("Enter");
    const panel = page.locator("header details");
    await expect(panel).toHaveAttribute("open", "");
    await expect(panel.getByRole("link", { name: "Ver todo el catálogo" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(panel).not.toHaveAttribute("open");
    await expect(summary).toBeFocused();
    // Un clic afuera también lo cierra.
    await summary.click();
    await expect(panel).toHaveAttribute("open", "");
    // En el pie: la home de ejemplo es corta y su <main> puede quedar bajo el panel abierto.
    await page.getByRole("contentinfo").click({ position: { x: 5, y: 5 } });
    await expect(panel).not.toHaveAttribute("open");
  });

  test("a 1024 px el menú cabe en una línea", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "escritorio", "menú de escritorio");
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto("/");
    const nav = page.locator("header").getByRole("navigation", { name: "Menú principal" });
    for (const link of await nav.getByRole("link").all())
      expect((await link.boundingBox())!.height).toBeLessThanOrEqual(48);
    const cotizar = page.locator("header").getByRole("link", { name: "Cotizar" });
    expect((await cotizar.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  });

  test("Productos se cierra cuando el foco sale con Tab", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "escritorio", "menú de escritorio");
    await page.goto("/");
    const panel = page.locator("header details");
    await page.locator("header summary").click();
    await expect(panel).toHaveAttribute("open", "");
    await page.locator("header").getByRole("link", { name: "Dónde comprar" }).focus();
    await expect(panel).not.toHaveAttribute("open");
  });

  test("menú móvil: se descarga al tocar, Escape cierra y el foco vuelve", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "movil", "menú móvil");
    const scripts: string[] = [];
    page.on("request", (r) => {
      if (r.resourceType() === "script") scripts.push(r.url());
    });
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const loaded = scripts.length;
    const button = page.getByRole("button", { name: "Abrir menú" });
    await button.click();
    const sheet = page.getByRole("dialog", { name: "Menú" });
    await expect(sheet).toBeVisible();
    // El Sheet no venía en la carga inicial.
    expect(scripts.length).toBeGreaterThan(loaded);
    await expect(sheet.getByRole("link", { name: "Cotizar" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(sheet).toHaveCount(0);
    await expect(button).toBeFocused();
  });

  test("menú móvil: se cierra al navegar y el foco vuelve al botón", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "movil", "menú móvil");
    await page.goto("/styleguide");
    // Navegación dentro del sitio sin recargar: el logo lleva a la home.
    await page.getByRole("link", { name: "Bolik, inicio" }).click();
    await expect(page).toHaveURL(/\/$/);
    const button = page.getByRole("button", { name: "Abrir menú" });
    await button.click();
    await expect(page.getByRole("dialog", { name: "Menú" })).toBeVisible();
    await page.goBack();
    await expect(page).toHaveURL(/\/styleguide$/);
    await expect(page.getByRole("dialog", { name: "Menú" })).toHaveCount(0);
    await expect(button).toBeFocused();
  });

  test("el contador lee la cotización guardada", async ({ page }) => {
    await page.addInitScript(() =>
      localStorage.setItem(
        "bolik_quote",
        JSON.stringify({ state: { lines: [{}, {}, {}] }, version: 1 }),
      ),
    );
    await page.goto("/");
    const link = page.getByRole("link", { name: "Mi cotización, 3 productos" });
    await expect(link).toBeVisible();
    await expect(link.locator("[data-quote-count]")).toHaveText("3");
  });
});
