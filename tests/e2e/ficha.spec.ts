import { collectConsoleErrors, expect, expectNoA11yViolations, test } from "./helpers";

// Ficha de producto /productos/[categoria]/[producto] (BD-062, docs/06 §3.4).

const ULTRA = "/productos/boligrafos/bolik-ultra";

type JsonLd = Record<string, unknown> & { "@type": string };

async function jsonLd(page: import("@playwright/test").Page): Promise<JsonLd[]> {
  return page
    .locator('script[type="application/ld+json"]')
    .evaluateAll((scripts) => scripts.map((s) => JSON.parse(s.textContent ?? "{}")));
}

test.describe("ficha de producto (BD-062)", () => {
  test("un h1, migas, canónica sin color, ProductGroup y BreadcrumbList; sin errores y pasa axe @critico", async ({
    page,
  }) => {
    const errors = collectConsoleErrors(page);
    await page.goto(ULTRA);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Bolik Ultra");
    await expect(page).toHaveTitle("Bolik Ultra, bolígrafo hexagonal punta 1.0 mm | Bolik");
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      /\/productos\/boligrafos\/bolik-ultra$/,
    );
    const crumbs = page.getByRole("navigation", { name: "Migas de pan" });
    await expect(crumbs.getByRole("link", { name: "Bolígrafos" })).toHaveAttribute(
      "href",
      "/productos/boligrafos",
    );

    const blocks = await jsonLd(page);
    const group = blocks.find((b) => b["@type"] === "ProductGroup")!;
    const variants = group.hasVariant as Record<string, string>[];
    expect(variants.map((v) => [v.sku, v.gtin12, v.color])).toEqual([
      ["PT00058", "759364663092", "Azul"],
      ["PT00059", "759364663108", "Negro"],
      ["PT00060", "759364663115", "Rojo"],
    ]);
    expect(group.variesBy).toBe("https://schema.org/color");
    expect(JSON.stringify(group)).not.toMatch(/price|offers|review|rating/i);
    const breadcrumbs = blocks.find((b) => b["@type"] === "BreadcrumbList")!;
    expect((breadcrumbs.itemListElement as unknown[]).length).toBe(4);
    expect(blocks.filter((b) => b["@type"] === "FAQPage")).toHaveLength(1);

    await expectNoA11yViolations(page);
    expect(errors, "errores en la consola").toEqual([]);
  });

  test("todo el contenido está en el HTML del servidor (sin JS)", async ({ browser }, testInfo) => {
    test.skip(testInfo.project.name !== "escritorio", "una vez basta");
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto(ULTRA);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Bolik Ultra");
    // Galería del color por defecto, su código y código de barras.
    await expect(page.getByRole("img", { name: /Bolik Ultra azul con el tapón/ })).toBeVisible();
    await expect(page.getByText("Color: Azul · Código PT00058")).toBeVisible();
    await expect(page.getByText("Código de barras 759364663092")).toBeVisible();
    // Datos clave, especificaciones, medidas, distribuidores y seguridad: sin JS, todo a la vista.
    await expect(page.getByRole("heading", { name: "Datos clave del Bolik Ultra" })).toBeVisible();
    await expect(page.getByText("Mediana 1.0 mm", { exact: true })).toBeVisible();
    await expect(page.getByRole("cell", { name: "145.83 mm" })).toBeVisible();
    await expect(page.getByRole("rowheader", { name: "Fardo (100 cajillas)" })).toBeVisible();
    await expect(page.getByText(/menores de 3 años/)).toBeVisible();
    // Sin JS no hay botón de agregar (necesita el navegador), pero sí Dónde comprar y WhatsApp.
    await expect(page.getByRole("button", { name: "Agregar a mi cotización" })).toBeHidden();
    await expect(page.getByRole("link", { name: "Dónde comprar" }).first()).toBeVisible();
    // Elegir otro color sin JS también cambia la foto y el código (CSS).
    await page.getByRole("radio", { name: /Rojo/ }).check({ force: true });
    await expect(page.getByText("Color: Rojo · Código PT00060")).toBeVisible();
    await expect(page.getByRole("img", { name: /Bolik Ultra rojo con el tapón/ })).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBe(0);
    await context.close();
  });

  test("cambiar de color no recarga: cambia foto, código y URL, y lo anuncia", async ({ page }) => {
    await page.goto(ULTRA);
    await page.waitForLoadState("networkidle");
    const marker = await page.evaluate(() => ((window as { __ficha?: number }).__ficha = 1));
    await page.getByRole("radio", { name: /Negro/ }).check({ force: true });
    await expect(page).toHaveURL(/\?color=negro$/);
    await expect(page.getByText("Color: Negro · Código PT00059")).toBeVisible();
    await expect(page.getByRole("img", { name: /Bolik Ultra negro con el tapón/ })).toBeVisible();
    await expect(page.getByRole("img", { name: /Bolik Ultra azul con el tapón/ })).toBeHidden();
    await expect(page.getByText("Color Negro · PT00059")).toBeAttached();
    // La misma página: la marca puesta antes del clic sigue ahí.
    expect(await page.evaluate(() => (window as { __ficha?: number }).__ficha)).toBe(marker);
  });

  test("?color=rojo pinta el rojo desde el inicio, sin moverse (CLS 0)", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto(`${ULTRA}?color=rojo`);
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("Color: Rojo · Código PT00060")).toBeVisible();
    await expect(page.getByRole("radio", { name: /Rojo/ })).toBeChecked();
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
  });

  test("agregar a mi cotización: toast, contador y se conserva al recargar", async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await page.goto(`${ULTRA}?color=rojo`);
    await page.getByRole("radio", { name: /Cajilla de 12/ }).check({ force: true });
    await page.getByRole("button", { name: "Elegir 20" }).click();
    await expect(page.getByText("Total: 240 unidades")).toBeVisible();
    await page.getByRole("button", { name: "Agregar a mi cotización" }).click();
    await expect(page.getByText("Agregado a tu cotización").first()).toBeVisible();
    await expect(page.getByText("20 cajillas de 12 de Bolik Ultra Rojo").first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Mi cotización, 1 producto" })).toBeVisible();
    // Otra vez lo mismo: suma la cantidad a la misma línea (el número no sube).
    await page.getByRole("button", { name: "Agregar a mi cotización" }).click();
    await expect(page.getByRole("link", { name: "Mi cotización, 1 producto" })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("link", { name: "Mi cotización, 1 producto" })).toBeVisible();
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("bolik_quote")!));
    expect(stored.state.lines).toEqual([
      expect.objectContaining({
        ref: "PT00060",
        packaging: "cajilla12",
        quantity: 40,
        url: "/productos/boligrafos/bolik-ultra?color=rojo",
      }),
    ]);
    expect(errors, "errores en la consola").toEqual([]);
  });

  test("WhatsApp con contexto: vista previa, copiar y abrir", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]).catch(() => {});
    await page.goto(`${ULTRA}?color=negro`);
    await page.getByRole("radio", { name: /Blister de 3/ }).check({ force: true });
    await page.getByRole("button", { name: "Elegir 5" }).waitFor({ state: "detached" });
    await page.getByRole("link", { name: /^Preguntar por WhatsApp/ }).click();
    const sheet = page.getByRole("dialog", { name: "Escríbenos por WhatsApp" });
    await expect(sheet).toBeVisible();
    await expect(sheet.locator("[data-whatsapp-preview]")).toHaveText(
      /^Hola, Bolik\. Me interesa Bolik Ultra Negro \(PT00059\), blister de 3 × 1\. ¿Me pueden dar precio y disponibilidad\? https?:\/\/\S+\/productos\/boligrafos\/bolik-ultra\?color=negro$/,
    );
    const open = sheet.getByRole("link", { name: /Abrir WhatsApp/ });
    await expect(open).toHaveAttribute("href", /^https:\/\/wa\.me\/50255551234\?text=/);
    await expect(open).toHaveAttribute("data-event", "whatsapp_open");
    await expect(open).toHaveAttribute("data-sku", "PT00059");
    await sheet.getByRole("button", { name: "Copiar" }).click();
    await expect(
      page.getByText(/^(Mensaje copiado|Selecciona el mensaje y cópialo manualmente)$/).first(),
    ).toBeVisible();
  });

  test("las miniaturas llevan a su foto y marcan la actual", async ({ page }) => {
    await page.goto(ULTRA);
    await page.waitForLoadState("networkidle");
    const gallery = page.locator(".gallery-set[data-color-variant='azul']");
    await gallery.getByRole("link", { name: "Foto 3 de 3" }).click();
    await expect(gallery.getByRole("link", { name: "Foto 3 de 3" })).toHaveAttribute(
      "aria-current",
      "true",
    );
    // La cajilla queda dentro de la tira, a la vista; la URL no cambia (sin #).
    await expect(
      gallery.getByRole("img", { name: /Cajilla de 12 bolígrafos Bolik Ultra azul/ }),
    ).toBeInViewport({ ratio: 0.9 });
    await expect(page).toHaveURL(/bolik-ultra$/);
  });

  test("una ficha que no existe o en otra categoría responde 404", async ({ page }) => {
    for (const path of ["/productos/boligrafos/no-existe", "/productos/marcadores/bolik-ultra"]) {
      const response = await page.goto(path);
      expect(response?.status(), path).toBe(404);
    }
  });
});

test.describe("ficha: medidas, relacionados y dónde comprar (BD-063)", () => {
  test("diagrama de medidas con su tabla, elegir una parte la resalta y pasa axe", async ({
    page,
  }) => {
    const errors = collectConsoleErrors(page);
    await page.goto(ULTRA);
    // En móvil las pestañas son acordeón: se abre «Medidas y empaque».
    const tab = page.getByRole("tab", { name: "Medidas y empaque" });
    if (await tab.isVisible()) await tab.click();
    else await page.getByRole("button", { name: "Medidas y empaque" }).click();
    const diagram = page.getByRole("img", { name: "Diagrama de medidas del Bolik Ultra" });
    await expect(diagram).toBeVisible();
    await expect(
      page.getByRole("table", { name: "Medidas del Bolik Ultra en milímetros" }),
    ).toBeVisible();
    const body = page.getByRole("radio", { name: /Largo del cuerpo 145.83 mm/ });
    await expect(body).toHaveAttribute("data-event", "dimension_open");
    await body.check({ force: true });
    const opacity = (part: string) =>
      page
        .locator(`.dimension-diagram svg [data-part="${part}"]`)
        .evaluate((el) => Number(getComputedStyle(el).opacity));
    await expect.poll(() => opacity("body")).toBe(1);
    await expect.poll(() => opacity("cap")).toBeLessThan(0.5);
    // «Todas» vuelve a mostrar todas las cotas.
    await page.getByRole("radio", { name: "Todas" }).check({ force: true });
    await expect.poll(() => opacity("cap")).toBe(1);
    await expectNoA11yViolations(page);
    expect(errors, "errores en la consola").toEqual([]);
  });

  test("sin JS se ven todas las cotas", async ({ browser }, testInfo) => {
    test.skip(testInfo.project.name !== "escritorio", "una vez basta");
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto(ULTRA);
    const labels = page.locator(".dimension-diagram svg .cota-label");
    await expect(labels).toHaveCount(5);
    await expect(labels.first()).toBeVisible();
    await context.close();
  });

  test("relacionados enlazan a su ficha y dónde comprar lleva cadenas y tiendas en línea", async ({
    page,
  }) => {
    await page.goto(ULTRA);
    const related = page.getByRole("region", { name: "También te puede servir" });
    await expect(related.getByRole("link", { name: /Bolik Ultra Fino/ })).toHaveAttribute(
      "href",
      "/productos/boligrafos/bolik-ultra-fino",
    );
    const where = page.getByRole("region", { name: "Dónde comprar este producto" });
    await expect(where.getByText("Unimarck", { exact: true })).toBeVisible();
    const walmart = where.getByRole("link", { name: /Comprar en Walmart/ });
    await expect(walmart).toHaveAttribute("href", "https://www.walmart.com.gt");
    await expect(walmart).toHaveAttribute("data-event", "retailer_click");
    await expect(walmart).toHaveAttribute("data-sku", "PT00058");
    await expect(walmart).toHaveAttribute("rel", "noopener noreferrer");
    await expect(where.getByRole("link", { name: "Ver todas las tiendas" })).toHaveAttribute(
      "href",
      "/donde-comprar",
    );
  });
});

test.describe("ficha: zoom adaptado y scripts previos al pintado", () => {
  test("al llegar por un enlace del sitio no hay errores en consola (catálogo → ficha → catálogo)", async ({
    page,
  }) => {
    const errors = collectConsoleErrors(page);
    await page.goto("/productos/boligrafos");
    await page.locator('a[href="/productos/boligrafos/bolik-ultra"]').first().click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Bolik Ultra");
    // Llegando por un enlace, la isla no dibuja el script previo (React no lo ejecutaría).
    await expect(page.locator("#ficha script:not([type])")).toHaveCount(0);
    await page
      .getByRole("navigation", { name: "Migas de pan" })
      .getByRole("link", { name: "Catálogo Bolik" })
      .click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Catálogo Bolik");
    await expect(page.locator("#catalogo-grilla ~ script")).toHaveCount(0);
    expect(errors, "errores en la consola").toEqual([]);
  });

  for (const [slug, expected] of [
    ["bolik-ultra", "~1.3x con la foto de 750 px"],
    ["bolik-ultra-fino", "2x con la foto de 3125 px"],
  ] as const) {
    test(`con mouse, la foto principal se amplía (${slug}: ${expected})`, async ({
      page,
    }, testInfo) => {
      test.skip(testInfo.project.name !== "escritorio", "el zoom es con mouse");
      await page.goto(`/productos/boligrafos/${slug}`);
      await page.waitForLoadState("networkidle");
      const slide = page.locator(".gallery-set[data-default] .gallery-slide").first();
      const box = (await slide.boundingBox())!;
      // El zoom se descarga al primer movimiento: se mueve el mouse hasta que se active.
      let step = 0;
      await expect(async () => {
        step += 1;
        await page.mouse.move(box.x + box.width / 2 + step, box.y + box.height / 2);
        await expect(slide).toHaveAttribute("data-zoomed", "", { timeout: 300 });
      }).toPass({ timeout: 10_000 });
      const scale = Number(
        await slide.evaluate((el) => getComputedStyle(el).getPropertyValue("--zoom-scale")),
      );
      if (slug === "bolik-ultra") {
        expect(scale).toBeGreaterThan(1.15);
        expect(scale).toBeLessThan(2);
      } else {
        expect(scale).toBe(2);
      }
      await page.mouse.move(0, 0);
      await expect(slide).not.toHaveAttribute("data-zoomed", "");
    });
  }
});
