import { expect, test } from "./helpers";

// Splash (BD-043, docs/09 §3, docs/13 §splash): primera visita a / en la sesión, 2 s, se salta con
// tecla o clic, nunca en otras rutas ni a bots, corto con movimiento reducido y nada sin JS. El
// contenido real está en el HTML debajo desde el primer momento. Las visitas usan waitUntil
// "commit": esperar a load (fuentes, imágenes) en un runner lento podría llegar después del splash.
test.describe("splash", () => {
  test.use({ showSplash: true });

  test("primera visita: aparece, el contenido está debajo y se va solo en ≤ 2.3 s", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      const w = window as unknown as { __cls: number };
      w.__cls = 0;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as unknown as { value: number }[])
          w.__cls += entry.value;
      }).observe({ type: "layout-shift", buffered: true });
    });
    await page.goto("/", { waitUntil: "commit" });
    const html = page.locator("html");
    await expect(html).toHaveAttribute("data-splash", "on");
    await expect(page.locator(".splash")).toBeVisible();
    // El hero ya está en el HTML (SEO): el splash solo lo tapa.
    await expect(page.getByRole("heading", { level: 1 })).toBeAttached();
    await expect(html).not.toHaveAttribute("data-splash", /.*/, { timeout: 2300 });
    await expect(page.locator(".splash")).toBeHidden();
    // Sin saltos al quitarse (la barra de scroll guarda su espacio).
    expect(await page.evaluate(() => (window as unknown as { __cls: number }).__cls)).toBe(0);
    // Segunda visita en la misma sesión: sin splash.
    await page.reload();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(html).not.toHaveAttribute("data-splash", /.*/);
  });

  test("Escape lo salta con un fundido corto que ya no captura clics", async ({ page }) => {
    await page.goto("/", { waitUntil: "commit" });
    const html = page.locator("html");
    await expect(html).toHaveAttribute("data-splash", "on");
    // Pasado el inicio (lo normal): la salida debe seguir siendo un fundido, no un corte.
    await page.waitForTimeout(400);
    await page.keyboard.press("Escape");
    await expect(html).toHaveAttribute("data-splash", "out");
    const overlay = page.locator(".splash");
    await expect(overlay).toHaveCSS("pointer-events", "none");
    const opacity = Number(await overlay.evaluate((el) => getComputedStyle(el).opacity));
    expect(opacity, "a media salida la opacidad va entre 0 y 1").toBeGreaterThan(0);
    await expect(html).not.toHaveAttribute("data-splash", /.*/, { timeout: 600 });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("un clic lo salta", async ({ page }) => {
    await page.goto("/", { waitUntil: "commit" });
    const html = page.locator("html");
    await expect(html).toHaveAttribute("data-splash", "on");
    await page.mouse.click(20, 200);
    await expect(html).not.toHaveAttribute("data-splash", /.*/, { timeout: 600 });
  });

  test("en otra ruta nunca aparece", async ({ page }) => {
    await page.goto("/styleguide");
    await expect(page.locator("html")).not.toHaveAttribute("data-splash", /.*/);
    await expect(page.locator(".splash")).toBeHidden();
  });

  test("con movimiento reducido: el logo quieto y corto", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/", { waitUntil: "commit" });
    const html = page.locator("html");
    // Primero aparece (sin animación) y luego se va solo en ~500 ms.
    await expect(html).toHaveAttribute("data-splash", "reduced");
    await expect(page.locator(".splash")).toHaveCSS("animation-name", "none");
    await expect(html).not.toHaveAttribute("data-splash", /.*/, { timeout: 700 });
  });
});

test.describe("splash: bots y sin JavaScript", () => {
  test.use({ showSplash: true });

  test("con UA de Googlebot nunca aparece", async ({ browser, baseURL }) => {
    const context = await browser.newContext({
      baseURL,
      userAgent: "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
    });
    const page = await context.newPage();
    await page.goto("/");
    await expect(page.locator("html")).not.toHaveAttribute("data-splash", /.*/);
    await expect(page.locator(".splash")).toBeHidden();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await context.close();
  });

  test("sin JavaScript no hay splash y la página se ve", async ({ browser, baseURL }) => {
    const context = await browser.newContext({ baseURL, javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto("/");
    await expect(page.locator(".splash")).toBeHidden();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await context.close();
  });
});
