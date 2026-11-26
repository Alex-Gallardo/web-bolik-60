import type { Page } from "@playwright/test";
import { collectConsoleErrors, expect, expectNoA11yViolations, test } from "./helpers";

// Dónde comprar (BD-080, docs/06 §3.7). Con DATA_SOURCE=fixtures: 25 tiendas publicadas, 5 en
// Quetzaltenango; Walmart y La Torre con tienda en línea.

const PATH = "/donde-comprar";
const TOTAL = 25;

const visibleStores = (page: Page) => page.locator("[data-store-item]:visible");
const departmentSelect = (page: Page) => page.getByRole("combobox", { name: "Departamento" });
const storeFilterEvents = (page: Page) =>
  page.evaluate(() =>
    ((window as unknown as { dataLayer?: Record<string, unknown>[] }).dataLayer ?? []).filter(
      (e) => e.event === "store_filter",
    ),
  );

test.describe("dónde comprar (BD-080)", () => {
  test("lista completa, un h1, migas, JSON-LD de tiendas y sin errores de axe @critico", async ({
    page,
  }) => {
    const errors = collectConsoleErrors(page);
    await page.goto(PATH);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Dónde comprar Bolik");
    await expect(page.getByRole("navigation", { name: "Migas de pan" })).toBeVisible();
    await expect(visibleStores(page)).toHaveCount(TOTAL);
    await expect(page.getByText(`${TOTAL} tiendas`, { exact: true })).toBeVisible();

    // Cadenas primero dentro de cada departamento (5 en Guatemala), luego librerías.
    const guatemala = page.locator('[data-store-group="guatemala"] article');
    for (let i = 0; i < 5; i++) await expect(guatemala.nth(i)).toContainText("Cadena");
    await expect(guatemala.nth(5)).toContainText("Librería");

    const types = await page
      .locator('script[type="application/ld+json"]')
      .evaluateAll((nodes) => nodes.map((n) => JSON.parse(n.textContent ?? "{}")["@type"]));
    expect(types).toEqual(expect.arrayContaining(["ItemList", "BreadcrumbList"]));

    await expectNoA11yViolations(page);
    expect(errors, "errores en la consola").toEqual([]);
  });

  test("el departamento filtra, deja el hash y registra store_filter", async ({ page }) => {
    await page.goto(PATH);
    await departmentSelect(page).selectOption("quetzaltenango");
    await expect(visibleStores(page)).toHaveCount(5);
    await expect(page.getByText("5 tiendas en Quetzaltenango")).toBeVisible();
    await expect(page).toHaveURL(/#quetzaltenango$/);
    expect(await storeFilterEvents(page)).toEqual([
      { event: "store_filter", department: "quetzaltenango" },
    ]);

    // Con JS el selector filtra al cambiar: «Ver tiendas» (del formulario sin JS) no se muestra.
    await expect(page.getByRole("button", { name: "Ver tiendas" })).toBeHidden();
    await expectNoA11yViolations(page);

    // «Volver arriba» (#top) no quita el filtro.
    await page.evaluate(() => {
      window.location.hash = "top";
    });
    await expect(visibleStores(page)).toHaveCount(5);

    await departmentSelect(page).selectOption("");
    await expect(visibleStores(page)).toHaveCount(TOTAL);
  });

  test("un departamento sin tiendas (desde la home) muestra su aviso y la lista completa", async ({
    page,
  }) => {
    await page.goto(`${PATH}#izabal`);
    await expect(page.getByText("Aún no tenemos tiendas registradas en Izabal")).toBeVisible();
    await expect(visibleStores(page)).toHaveCount(TOTAL);
    await expect(departmentSelect(page)).toHaveValue("");
  });

  test("los enlaces por departamento filtran y bajan a su grupo", async ({ page }) => {
    await page.goto(`${PATH}#quetzaltenango`);
    await expect(visibleStores(page)).toHaveCount(5);
    await page
      .getByRole("region", { name: "Busca por departamento" })
      .getByRole("link", { name: "Sololá" })
      .click();
    await expect(page).toHaveURL(/#solola$/);
    await expect(departmentSelect(page)).toHaveValue("solola");
    await expect(page.locator('[data-store-group="solola"]')).toBeInViewport();
    await expect(page.locator('[data-store-group="quetzaltenango"]')).toBeHidden();
  });

  test("buscar por nombre ignora tildes; sin resultados, el aviso amable", async ({ page }) => {
    await page.goto(PATH);
    const search = page.getByRole("searchbox", { name: "Buscar tienda por nombre" });
    // Dos librerías Tulán: Quetzaltenango y Mazatenango.
    await search.fill("tulan");
    await expect(visibleStores(page)).toHaveCount(2);
    await departmentSelect(page).selectOption("quetzaltenango");
    await expect(visibleStores(page)).toHaveCount(1);
    await expect(visibleStores(page)).toContainText("Tulán");
    await search.fill("papelería inexistente");
    await expect(visibleStores(page)).toHaveCount(0);
    await expect(page.getByText(/No encontramos tiendas con ese nombre/)).toBeVisible();
    await page.getByRole("button", { name: "Quitar filtros" }).click();
    await expect(visibleStores(page)).toHaveCount(TOTAL);
    await expect(search).toHaveValue("");
  });

  test("«Cómo llegar» y la compra en línea llevan su evento y abren otra pestaña", async ({
    page,
  }) => {
    await page.goto(PATH);
    const directions = page
      .locator('[data-store-group="quetzaltenango"]')
      .getByRole("link", { name: /^Cómo llegar a Tulán/ });
    await expect(directions).toHaveAttribute("data-event", "maps_click");
    await expect(directions).toHaveAttribute("data-store", "tulan-quetzaltenango");
    await expect(directions).toHaveAttribute("data-department", "quetzaltenango");
    await expect(directions).toHaveAttribute("href", /^https:\/\/www\.google\.com\/maps\/dir\//);
    await expect(directions).toHaveAttribute("target", "_blank");

    const online = page
      .getByRole("region", { name: "Compra en línea" })
      .getByRole("link", { name: /^Comprar en Walmart/ });
    await expect(online).toHaveAttribute("data-event", "retailer_click");
    await expect(online).toHaveAttribute("data-retailer", "walmart");
    await expect(online).toHaveAttribute("rel", "noopener noreferrer");
  });

  test("el aviso a distribuidores lleva a /mayoreo#distribuidor", async ({ page }) => {
    await page.goto(PATH);
    await expect(
      page.getByRole("link", { name: "¿Tienes una librería? Vende Bolik" }),
    ).toHaveAttribute("href", "/mayoreo#distribuidor");
  });

  test.describe("móvil", () => {
    test.use({ viewport: { width: 360, height: 800 } });
    test("a 360 px no hay scroll horizontal", async ({ page }) => {
      await page.goto(PATH);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });
  });
});

test.describe("dónde comprar sin JavaScript (BD-080)", () => {
  test.use({ javaScriptEnabled: false });

  test("se ven todas las tiendas; sin la búsqueda, con «Ver tiendas»", async ({ page }) => {
    await page.goto(PATH);
    await expect(visibleStores(page)).toHaveCount(TOTAL);
    await expect(page.getByRole("searchbox", { name: "Buscar tienda por nombre" })).toBeHidden();
    await expect(page.getByRole("button", { name: "Ver tiendas" })).toBeVisible();
  });

  test("el formulario lleva al grupo del departamento con la lista completa", async ({
    page,
    request,
  }) => {
    await page.goto(PATH);
    const form = page.locator("form", { has: departmentSelect(page) });
    await expect(form).toHaveAttribute("action", PATH);
    await expect(form).toHaveAttribute("method", "get");
    await expect(departmentSelect(page)).toHaveAttribute("name", "departamento");
    // El 307 sale con la URL pública del sitio (NEXT_PUBLIC_SITE_URL): en local puede ser otro
    // servidor y en la CI es este mismo origen, que Next deja relativo. Se revisa su destino sin
    // seguirlo (resuelto contra la respuesta) y se abre aquí, como en qr.spec.ts.
    const response = await request.get(`${PATH}?departamento=quetzaltenango`, {
      maxRedirects: 0,
    });
    expect(response.status()).toBe(307);
    const location = new URL(response.headers().location!, response.url());
    expect(`${location.pathname}${location.hash}`).toBe(`${PATH}#quetzaltenango`);

    await page.goto(`${PATH}#quetzaltenango`);
    await expect(visibleStores(page)).toHaveCount(TOTAL);
    await expect(page.locator("#quetzaltenango")).toBeInViewport();
  });
});
