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

// ── Mapa y «Usar mi ubicación» (BD-081) ──
// Los mapas base de OpenStreetMap no se piden en las pruebas (sin red externa en la CI): un PNG de
// 1×1. Con DATA_SOURCE=fixtures hay tiendas en 7 departamentos: 7 pines.

const PIXEL = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=",
  "base64",
);
const PINS = 7;
const XELA = { latitude: 14.8344, longitude: -91.5186 };

/** Responde los mapas base y anota qué archivos JS traen Leaflet y cuándo llegaron. */
async function watchMap(page: Page) {
  await page.route("https://tile.openstreetmap.org/**", (route) =>
    route.fulfill({ status: 200, contentType: "image/png", body: PIXEL }),
  );
  const leaflet: string[] = [];
  page.on("response", async (response) => {
    if (response.request().resourceType() !== "script") return;
    const body = await response.text().catch(() => "");
    if (body.includes("_leaflet_id")) leaflet.push(response.url());
  });
  return leaflet;
}

const pins = (page: Page) => page.locator(".store-pin");
const locateButton = (page: Page) => page.getByRole("button", { name: "Usar mi ubicación" });

test.describe("mapa de tiendas en escritorio (BD-081)", () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test("el mapa se descarga después de load, no en la carga inicial @critico", async ({ page }) => {
    const errors = collectConsoleErrors(page);
    const leaflet = await watchMap(page);
    await page.goto(PATH);
    await expect(pins(page)).toHaveCount(PINS);
    await expect.poll(() => leaflet.length).toBe(1);
    // El HTML del servidor no lo nombra (Turbopack agrega después un <script> por cada archivo que
    // descarga, por eso no se revisa el DOM), y su petición empezó después del evento load.
    const html = await (await page.request.get(PATH)).text();
    expect(html).not.toContain(new URL(leaflet[0]!).pathname);
    const timing = await page.evaluate((url) => {
      const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
      const entry = performance.getEntriesByName(url)[0];
      return { load: nav.loadEventStart, start: entry?.startTime ?? -1 };
    }, leaflet[0]!);
    expect(timing.start).toBeGreaterThanOrEqual(timing.load);
    // Su CSS llega con él: el contenedor tiene las reglas de leaflet.css.
    await expect(page.locator(".leaflet-container")).toHaveCSS("overflow", "hidden");
    await expect(page.getByText("OpenStreetMap")).toBeVisible();
    expect(errors, "errores en la consola").toEqual([]);
  });

  test("escribir en la búsqueda no quita la marca del pin elegido", async ({ page }) => {
    await watchMap(page);
    await page.goto(`${PATH}#quetzaltenango`);
    const xela = page.getByRole("button", { name: "Quetzaltenango: 5 tiendas" });
    await expect(xela).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("searchbox", { name: "Buscar tienda por nombre" }).fill("tulan");
    await expect(visibleStores(page)).toHaveCount(1);
    await expect(xela).toHaveClass(/store-pin--active/);
    await expect(xela).toHaveAttribute("aria-pressed", "true");
  });

  test("tocar un pin filtra la lista y lo marca; el selector mueve el mapa", async ({ page }) => {
    await watchMap(page);
    await page.goto(PATH);
    const xela = page.getByRole("button", { name: "Quetzaltenango: 5 tiendas" });
    await xela.click();
    await expect(visibleStores(page)).toHaveCount(5);
    await expect(page).toHaveURL(/#quetzaltenango$/);
    await expect(departmentSelect(page)).toHaveValue("quetzaltenango");
    await expect(xela).toHaveAttribute("aria-pressed", "true");
    expect(await storeFilterEvents(page)).toEqual([
      { event: "store_filter", department: "quetzaltenango" },
    ]);

    await departmentSelect(page).selectOption("solola");
    await expect(page.getByRole("button", { name: "Sololá: 2 tiendas" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(xela).toHaveAttribute("aria-pressed", "false");
  });

  test("los pines se usan con el teclado y el mapa no tiene errores de axe", async ({ page }) => {
    await watchMap(page);
    await page.goto(PATH);
    const solola = page.getByRole("button", { name: "Sololá: 2 tiendas" });
    await solola.focus();
    await page.keyboard.press("Enter");
    await expect(visibleStores(page)).toHaveCount(2);
    await expect(solola).toBeFocused();
    await expect(page.getByRole("button", { name: "Acercar" })).toBeVisible();
    await expectNoA11yViolations(page);
  });
});

test.describe("mapa de tiendas en móvil (BD-081)", () => {
  test.use({ viewport: { width: 360, height: 800 } });

  test("sin «Ver mapa» no se descarga; la hoja abre el mapa y un pin la cierra filtrando @critico", async ({
    page,
  }) => {
    const errors = collectConsoleErrors(page);
    const leaflet = await watchMap(page);
    await page.goto(PATH);
    await page.waitForLoadState("load");
    await expect(page.getByRole("button", { name: "Ver mapa" })).toBeVisible();
    // Sin la hoja no hay mapa: el lugar de escritorio está oculto.
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect(page.locator(".leaflet-container")).toHaveCount(0);
    expect(leaflet).toEqual([]);

    await page.getByRole("button", { name: "Ver mapa" }).click();
    const sheet = page.getByRole("dialog", { name: "Mapa de tiendas" });
    await expect(sheet).toBeVisible();
    await expect(sheet.locator(".store-pin")).toHaveCount(PINS);
    await expect.poll(() => leaflet.length).toBe(1);
    await expectNoA11yViolations(page);

    await sheet.getByRole("button", { name: "Quetzaltenango: 5 tiendas" }).click();
    await expect(sheet).toBeHidden();
    await expect(visibleStores(page)).toHaveCount(5);
    await expect(page.getByRole("button", { name: "Ver mapa" })).toBeFocused();
    // Abrir otra vez: el mapa ya llegó (no se pide de nuevo) y queda en el departamento.
    await page.getByRole("button", { name: "Ver mapa" }).click();
    await expect(page.getByRole("button", { name: "Quetzaltenango: 5 tiendas" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await page.keyboard.press("Escape");
    await expect(sheet).toBeHidden();
    // Un zoom animado que terminara sobre el mapa ya cerrado lanzaría un error (revisor de BD-081).
    await page.waitForTimeout(500);
    expect(leaflet).toHaveLength(1);
    expect(errors, "errores en la consola").toEqual([]);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

test.describe("usar mi ubicación con permiso (BD-081)", () => {
  test.use({ geolocation: XELA, permissions: ["geolocation"] });

  test("elige el departamento más cercano y avisa cuántas tiendas hay", async ({ page }) => {
    await watchMap(page);
    await page.goto(PATH);
    await locateButton(page).click();
    await expect(page.getByText("Encontramos 5 tiendas cerca").first()).toBeVisible();
    await expect(visibleStores(page)).toHaveCount(5);
    await expect(departmentSelect(page)).toHaveValue("quetzaltenango");
    await expect(page).toHaveURL(/#quetzaltenango$/);
    const events = await page.evaluate(() =>
      ((window as unknown as { dataLayer?: Record<string, unknown>[] }).dataLayer ?? []).filter(
        (e) => e.event === "store_locate",
      ),
    );
    expect(events).toEqual([{ event: "store_locate", result: "ok", department: "quetzaltenango" }]);
  });
});

test.describe("usar mi ubicación sin permiso (BD-081)", () => {
  test("permiso denegado: aviso amable y el foco en el selector de departamento @critico", async ({
    page,
    context,
  }) => {
    await watchMap(page);
    await context.clearPermissions();
    // Un navegador que niega el permiso (Chromium y WebKit sin concederlo responden igual).
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "geolocation", {
        configurable: true,
        value: {
          getCurrentPosition: (_ok: unknown, fail: (error: GeolocationPositionError) => void) =>
            setTimeout(() =>
              fail({ code: 1, PERMISSION_DENIED: 1 } as unknown as GeolocationPositionError),
            ),
        },
      });
    });
    await page.goto(PATH);
    await locateButton(page).click();
    await expect(page.getByText("No pasa nada").first()).toBeVisible();
    await expect(departmentSelect(page)).toBeFocused();
    await expect(departmentSelect(page)).toBeVisible();
    await expect(visibleStores(page)).toHaveCount(TOTAL);
  });
});
