import { collectConsoleErrors, expect, expectNoA11yViolations, test } from "./helpers";
import { MAP_PINS, watchMap } from "./stores-helpers";

// Páginas por departamento (BD-082, docs/06 §3.8). Con DATA_SOURCE=fixtures: 6 tiendas en
// Quetzaltenango (una de ejemplo, verificada y con ubicación); Izabal no tiene tiendas.

const XELA = "/donde-comprar/quetzaltenango";

test.describe("página de un departamento (BD-082)", () => {
  test("título, h1, migas, sus tiendas, JSON-LD y sin errores de axe @critico", async ({
    page,
  }) => {
    const errors = collectConsoleErrors(page);
    await watchMap(page);
    await page.goto(XELA);
    await expect(page).toHaveTitle(/^Dónde comprar Bolik en Quetzaltenango/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Dónde comprar Bolik en Quetzaltenango",
    );
    const crumbs = page.getByRole("navigation", { name: "Migas de pan" });
    await expect(
      crumbs.getByRole("link", { name: "Dónde comprar Bolik", exact: true }),
    ).toHaveAttribute("href", "/donde-comprar");
    await expect(page.getByText("6 tiendas en Quetzaltenango")).toBeVisible();
    await expect(page.getByRole("article")).toHaveCount(6);
    // La verificada muestra su dirección; «Cómo llegar» va a sus coordenadas.
    const sample = page.getByRole("article").filter({ hasText: "Librería Xela Centro (ejemplo)" });
    await expect(sample).toContainText("Dirección de ejemplo (demo)");
    await expect(sample.getByRole("link", { name: /^Cómo llegar/ })).toHaveAttribute(
      "href",
      /destination=14\.8346,-91\.5183$/,
    );

    const jsonLd = await page
      .locator('script[type="application/ld+json"]')
      .evaluateAll((nodes) => nodes.map((n) => JSON.parse(n.textContent ?? "{}")));
    expect(jsonLd.map((d) => d["@type"])).toEqual(
      expect.arrayContaining(["ItemList", "BreadcrumbList"]),
    );
    const list = jsonLd.find((d) => d["@type"] === "ItemList");
    expect(list.itemListElement).toHaveLength(6);
    const geo = list.itemListElement
      .map((e: { item: { geo?: { latitude: number } } }) => e.item.geo)
      .filter(Boolean);
    expect(geo).toEqual([{ "@type": "GeoCoordinates", latitude: 14.8346, longitude: -91.5183 }]);

    // Sin texto local (Department.intro) no se indexa ni va al sitemap (docs/10 §9).
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    const sitemap = await (await page.request.get("/sitemap.xml")).text();
    expect(sitemap).not.toContain("/donde-comprar/quetzaltenango");

    await expectNoA11yViolations(page);
    expect(errors, "errores en la consola").toEqual([]);
  });

  test("enlaza los departamentos cercanos, todas las tiendas y a distribuidores", async ({
    page,
  }) => {
    await page.goto(XELA);
    const nearby = page.getByRole("region", { name: "Departamentos cercanos" });
    // Los 3 con tiendas más cercanos, de centro a centro.
    await expect(nearby.getByRole("list").getByRole("link")).toHaveText([
      "Suchitepéquez",
      "Sololá",
      "Huehuetenango",
    ]);
    await expect(page.getByRole("link", { name: "Ver todas las tiendas" })).toHaveAttribute(
      "href",
      "/donde-comprar",
    );
    await expect(
      page.getByRole("link", { name: "¿No hay tienda cerca? Sé distribuidor Bolik" }),
    ).toHaveAttribute("href", "/mayoreo#distribuidor");
    await nearby.getByRole("link", { name: "Sololá" }).click();
    await expect(page).toHaveURL(/\/donde-comprar\/solola$/);
    await expect(page.getByRole("article")).toHaveCount(2);
  });

  test("el departamento de Guatemala no repite el título de /donde-comprar", async ({ page }) => {
    await page.goto("/donde-comprar/guatemala");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Dónde comprar Bolik en el departamento de Guatemala",
    );
  });

  test("un departamento sin tiendas o que no existe da 404", async ({ request }) => {
    expect((await request.get("/donde-comprar/izabal")).status()).toBe(404);
    expect((await request.get("/donde-comprar/no-existe")).status()).toBe(404);
  });

  test.describe("mapa en escritorio", () => {
    test.use({ viewport: { width: 1280, height: 900 } });

    test("centrado en el departamento; el pin de otro lleva a su página", async ({ page }) => {
      await watchMap(page);
      await page.goto(XELA);
      await expect(page.locator(".store-pin")).toHaveCount(MAP_PINS);
      await expect(page.getByRole("button", { name: "Quetzaltenango: 6 tiendas" })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      // La tienda de ejemplo tiene su propio pin, encima del de su departamento (se puede tocar).
      await page
        .getByRole("button", { name: "Librería Xela Centro (ejemplo)" })
        .click({ trial: true });
      await page.getByRole("button", { name: "Huehuetenango: 2 tiendas" }).click();
      await expect(page).toHaveURL(/\/donde-comprar\/huehuetenango$/);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(
        "Dónde comprar Bolik en Huehuetenango",
      );
    });
  });

  test.describe("móvil", () => {
    test.use({ viewport: { width: 360, height: 800 } });

    test("«Ver mapa» abre la hoja y no hay scroll horizontal", async ({ page }) => {
      const errors = collectConsoleErrors(page);
      const leaflet = await watchMap(page);
      await page.goto(XELA);
      await page.waitForLoadState("load");
      // En móvil el mapa no se descarga hasta tocar «Ver mapa».
      expect(leaflet).toEqual([]);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
      // Ni siquiera rozando el margen de 16 px: en la CI (Linux) el texto mide unos px más que en
      // Windows y un enlace que no se parte desbordaba 3 px.
      const tooWide = await page.evaluate(() => {
        const limit = document.documentElement.clientWidth - 16 + 0.5;
        return [...document.querySelectorAll<HTMLElement>("main a, main button")]
          .filter((el) => el.offsetParent && !el.closest(".sr-only"))
          .filter((el) => el.getBoundingClientRect().right > limit)
          .map((el) => el.textContent?.trim());
      });
      expect(tooWide).toEqual([]);
      await page.getByRole("button", { name: "Ver mapa" }).click();
      const sheet = page.getByRole("dialog", { name: "Mapa de tiendas" });
      await expect(sheet.locator(".store-pin")).toHaveCount(MAP_PINS);
      await sheet.getByRole("button", { name: "Sololá: 2 tiendas" }).click();
      await expect(page).toHaveURL(/\/donde-comprar\/solola$/);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(
        "Dónde comprar Bolik en Sololá",
      );
      expect(errors, "errores en la consola").toEqual([]);
    });
  });
});

test.describe("página de un departamento sin JavaScript (BD-082)", () => {
  test.use({ javaScriptEnabled: false });

  test("se ven sus tiendas en tres columnas, sin mapa", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(XELA);
    await expect(page.getByRole("article")).toHaveCount(6);
    await expect(page.getByRole("button", { name: "Ver mapa" })).toBeHidden();
    const columns = await page
      .getByRole("article")
      .first()
      .evaluate((el) => getComputedStyle(el.closest("ul")!).gridTemplateColumns.split(" ").length);
    expect(columns).toBe(3);
  });
});
