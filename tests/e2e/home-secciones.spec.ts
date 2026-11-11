import { collectConsoleErrors, expect, expectNoA11yViolations, skipSplash, test } from "./helpers";

// Secciones de la home (BD-051): «Un Bolik para cada etapa» y el catálogo destacado.
test.beforeEach(async ({ page }) => {
  await skipSplash(page);
});

test.describe("home: soluciones y catálogo (BD-051)", () => {
  test("las tarjetas de público enlazan a rutas reales, sin errores y pasa axe", async ({
    page,
  }) => {
    const errors = collectConsoleErrors(page);
    await page.goto("/");
    const solutions = page.getByRole("region", { name: "Un Bolik para cada etapa" });
    await solutions.scrollIntoViewIfNeeded();
    const hrefs = await solutions
      .getByRole("link")
      .evaluateAll((links) => links.map((a) => a.getAttribute("href")));
    expect(hrefs).toEqual([
      "/escuelas",
      "/empresas",
      "/empresas",
      "/mayoreo",
      "/mayoreo#distribuidor",
    ]);
    await expectNoA11yViolations(page);
    expect(errors, "errores en la consola").toEqual([]);
  });

  test("en móvil las tarjetas son un carrusel que no desborda la página", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name === "escritorio", "carrusel de móvil");
    await page.goto("/");
    const list = page.getByRole("region", { name: "Un Bolik para cada etapa" }).getByRole("list");
    const { scroll, client } = await list.evaluate((el) => ({
      scroll: el.scrollWidth,
      client: el.clientWidth,
    }));
    expect(scroll).toBeGreaterThan(client);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBe(0);
  });

  test("a 360, 768 y 1024 px nada desborda (página ni títulos de tarjeta)", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "escritorio", "los anchos se fijan aquí");
    for (const width of [360, 768, 1024]) {
      await page.setViewportSize({ width, height: 800 });
      await page.goto("/");
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `página a ${width} px`).toBe(0);
      const clipped = await page
        .getByRole("region", { name: "Un Bolik para cada etapa" })
        .getByRole("heading", { level: 3 })
        .evaluateAll((titles) =>
          titles.filter((h) => h.scrollWidth > h.clientWidth).map((h) => h.textContent),
        );
      expect(clipped, `títulos cortados a ${width} px`).toEqual([]);
    }
  });

  test("el buscador manda a /buscar con la consulta", async ({ page }) => {
    await page.goto("/");
    const catalog = page.getByRole("region", { name: "Encuentra lo que necesitas" });
    await catalog.getByRole("searchbox", { name: "Buscar en el catálogo" }).fill("ultra");
    await catalog.getByRole("button", { name: "Buscar" }).click();
    await expect(page).toHaveURL(/\/buscar\?q=ultra$/);
  });

  test("chips de línea y categorías enlazan al catálogo", async ({ page }) => {
    await page.goto("/");
    const catalog = page.getByRole("region", { name: "Encuentra lo que necesitas" });
    await expect(
      catalog.getByRole("list", { name: "Líneas de producto" }).getByRole("link"),
    ).toHaveCount(4);
    await expect(catalog.getByRole("link", { name: "Escolar", exact: true })).toHaveAttribute(
      "href",
      "/productos?linea=escolar",
    );
    const cards = catalog.getByRole("heading", { level: 3 });
    await expect(cards).toHaveCount(8);
    await expect(catalog.getByRole("link", { name: /Bolígrafos/ }).first()).toHaveAttribute(
      "href",
      "/productos/boligrafos",
    );
    await expect(catalog.getByRole("link", { name: "Ver todo el catálogo" })).toHaveAttribute(
      "href",
      "/productos",
    );
  });
});

test.describe("home sin JavaScript (BD-051)", () => {
  test.use({ javaScriptEnabled: false });

  test("las tarjetas y el buscador se ven", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("region", { name: "Un Bolik para cada etapa" }).getByRole("link").first(),
    ).toBeVisible();
    await expect(page.getByRole("searchbox", { name: "Buscar en el catálogo" })).toBeVisible();
    await expect(
      page.getByRole("region", { name: "Encuentra lo que necesitas" }).getByRole("heading", {
        level: 3,
      }),
    ).toHaveCount(8);
  });
});
