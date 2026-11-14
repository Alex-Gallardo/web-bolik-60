import { collectConsoleErrors, expect, expectNoA11yViolations, test } from "./helpers";

// Página de categoría /productos/[categoria] (BD-061, docs/06 §3.3).

test.describe("categoría (BD-061)", () => {
  test("migas, un h1, productos, botones y JSON-LD válido; sin errores y pasa axe @critico", async ({
    page,
  }) => {
    const errors = collectConsoleErrors(page);
    await page.goto("/productos/marcadores");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Marcadores");
    const crumbs = page.getByRole("navigation", { name: "Migas de pan" });
    await expect(crumbs.getByRole("link", { name: "Catálogo Bolik" })).toHaveAttribute(
      "href",
      "/productos",
    );
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      /\/productos\/marcadores$/,
    );
    await expect(page.getByRole("link", { name: "Cotizar esta línea por mayor" })).toHaveAttribute(
      "href",
      "/mayoreo",
    );

    const blocks = await page
      .locator('script[type="application/ld+json"]')
      .evaluateAll((scripts) => scripts.map((s) => JSON.parse(s.textContent ?? "{}")));
    const breadcrumbs = blocks.find((b) => b["@type"] === "BreadcrumbList");
    expect(
      breadcrumbs.itemListElement.map((i: { position: number; name: string; item: string }) => [
        i.position,
        i.name,
        new URL(i.item).pathname,
      ]),
    ).toEqual([
      [1, "Inicio", "/"],
      [2, "Catálogo Bolik", "/productos"],
      [3, "Marcadores", "/productos/marcadores"],
    ]);
    const collection = blocks.find((b) => b["@type"] === "CollectionPage");
    await expect(page.locator("#categoria-productos h2")).toHaveCount(
      collection.mainEntity.numberOfItems,
    );
    await expectNoA11yViolations(page);
    expect(errors, "errores en la consola").toEqual([]);
  });

  test("cada categoría tiene title y description propios", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "escritorio", "una vez basta");
    await page.goto("/productos");
    const hrefs = await page
      .getByRole("region", { name: "Categorías" })
      .getByRole("link")
      .evaluateAll((links) => links.map((a) => a.getAttribute("href")!));
    expect(hrefs.length).toBeGreaterThan(1);
    const seen = { titles: new Set<string>(), descriptions: new Set<string>() };
    for (const href of hrefs) {
      await page.goto(href);
      seen.titles.add(await page.title());
      seen.descriptions.add(
        (await page.locator('meta[name="description"]').getAttribute("content")) ?? "",
      );
    }
    expect(seen.titles.size).toBe(hrefs.length);
    expect(seen.descriptions.size).toBe(hrefs.length);
  });

  test("una categoría que no existe o no está publicada responde 404", async ({ page }) => {
    for (const slug of ["no-existe", "tablas-y-estuches"]) {
      const response = await page.goto(`/productos/${slug}`);
      expect(response?.status(), slug).toBe(404);
    }
  });

  test("a 360 px nada desborda y sin JS se ven los productos", async ({ browser }, testInfo) => {
    test.skip(testInfo.project.name !== "escritorio", "los anchos se fijan aquí");
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto("/productos/boligrafos");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBe(0);
    await expect(
      page.getByRole("heading", { level: 2, name: "Bolik Ultra", exact: true }),
    ).toBeVisible();
    await context.close();
  });
});
