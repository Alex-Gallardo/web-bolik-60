import { collectConsoleErrors, expect, expectNoA11yViolations, test } from "./helpers";

// Catálogo /productos (BD-060, docs/06 §3.2): grilla completa del servidor y filtros en cliente.

test.describe("catálogo /productos (BD-060)", () => {
  test("un h1, migas, canónica sin parámetros, JSON-LD, sin errores y pasa axe @critico", async ({
    page,
  }) => {
    const errors = collectConsoleErrors(page);
    await page.goto("/productos?linea=escolar");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Catálogo Bolik");
    const crumbs = page.getByRole("navigation", { name: "Migas de pan" });
    await expect(crumbs.getByRole("link", { name: "Inicio" })).toHaveAttribute("href", "/");
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/productos$/);
    const types = await page
      .locator('script[type="application/ld+json"]')
      .evaluateAll((scripts) => scripts.map((s) => JSON.parse(s.textContent ?? "{}")["@type"]));
    expect(types).toEqual(expect.arrayContaining(["BreadcrumbList", "CollectionPage"]));
    await expectNoA11yViolations(page);
    expect(errors, "errores en la consola").toEqual([]);
  });

  test("filtrar no pide nada al servidor y la URL se puede compartir", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "escritorio", "barra de escritorio (en móvil, el sheet)");
    await page.goto("/productos");
    await page.waitForLoadState("networkidle");
    const requests: string[] = [];
    page.on("request", (request) => {
      if (["document", "fetch", "xhr"].includes(request.resourceType()))
        requests.push(request.url());
    });
    const filters = page.getByRole("region", { name: "Filtrar productos" });
    const count = page.locator("#catalogo-contador");
    const total = await count.textContent();
    await filters.getByRole("button", { name: "Arte", exact: true }).click();
    await expect(page).toHaveURL(/\/productos\?linea=arte$/);
    await expect(count).not.toHaveText(total!);
    const visible = await page.locator("[data-product]:visible").count();
    await expect(count).toHaveText(`${visible} ${visible === 1 ? "producto" : "productos"}`);
    expect(requests, "peticiones al filtrar").toEqual([]);

    // El enlace compartido abre con el mismo filtro.
    await page.goto("/productos?linea=arte");
    await expect(filters.getByRole("button", { name: "Arte", exact: true })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(page.locator("[data-product]:visible")).toHaveCount(visible);
  });

  test("sin resultados: estado vacío y «Quitar filtros»", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "escritorio", "barra de escritorio");
    await page.goto("/productos?linea=arte&uso=promocional&color=transparente");
    await expect(page.getByText("No hay productos con esos filtros")).toBeVisible();
    await page.getByRole("button", { name: "Quitar filtros" }).last().click();
    await expect(page).toHaveURL(/\/productos$/);
    await expect(page.locator("[data-product]:visible")).toHaveCount(
      await page.locator("[data-product]").count(),
    );
  });

  test("en móvil, «Filtros» abre un sheet que cuenta en vivo", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "escritorio", "sheet de móvil");
    await page.goto("/productos");
    await page.getByRole("button", { name: "Filtros" }).click();
    const sheet = page.getByRole("dialog", { name: "Filtros" });
    await expect(sheet).toBeVisible();
    await sheet.getByRole("button", { name: "Arte", exact: true }).click();
    const visible = await page.locator("[data-product]:not([hidden])").count();
    await sheet
      .getByRole("button", { name: `Ver ${visible} ${visible === 1 ? "producto" : "productos"}` })
      .click();
    await expect(sheet).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Filtros (1)" })).toBeFocused();
    await expect(page).toHaveURL(/\?linea=arte$/);
  });

  test("un enlace filtrado no mueve la página al hidratar (CLS 0)", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto("/productos?linea=arte");
    await page.waitForLoadState("networkidle");
    const shift = await page.evaluate(
      () =>
        new Promise<number>((resolve) => {
          let total = 0;
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries() as (PerformanceEntry & {
              value: number;
              hadRecentInput: boolean;
            })[]) {
              if (!entry.hadRecentInput) total += entry.value;
            }
          }).observe({ type: "layout-shift", buffered: true });
          setTimeout(() => resolve(total), 500);
        }),
    );
    expect(shift).toBeLessThan(0.01);
    const visible = await page.locator("[data-product]:visible").count();
    expect(visible).toBeLessThan(await page.locator("[data-product]").count());
  });

  test("estando filtrado, un enlace a /productos deja la URL y la grilla sin filtros", async ({
    page,
  }) => {
    await page.goto("/productos?linea=arte");
    await expect(page).toHaveURL(/\?linea=arte$/);
    // «Ver todo el catálogo» del pie: un <Link> de Next (navegación del router, no recarga).
    await page.getByRole("contentinfo").getByRole("link", { name: "Ver todo el catálogo" }).click();
    await expect(page).toHaveURL(/\/productos$/);
    await expect(page.locator("[data-product]:visible")).toHaveCount(
      await page.locator("[data-product]").count(),
    );
  });

  test("a 360, 768 y 1280 px nada desborda", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "escritorio", "los anchos se fijan aquí");
    for (const width of [360, 768, 1280]) {
      await page.setViewportSize({ width, height: 800 });
      await page.goto("/productos");
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `página a ${width} px`).toBe(0);
    }
  });
});

test.describe("catálogo sin JavaScript (BD-060)", () => {
  test.use({ javaScriptEnabled: false });

  test("se ven todos los productos y no hay filtros que no funcionen", async ({ page }) => {
    await page.goto("/productos?linea=arte");
    const all = await page.locator("[data-product]").count();
    expect(all).toBeGreaterThan(0);
    await expect(page.locator("[data-product]:visible")).toHaveCount(all);
    await expect(page.getByRole("region", { name: "Filtrar productos" })).toBeHidden();
    await expect(page.getByRole("searchbox", { name: "Buscar en el catálogo" })).toBeVisible();
  });
});
