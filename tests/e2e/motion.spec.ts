import type { Page } from "@playwright/test";
import { expect, expectNoA11yViolations, test } from "./helpers";

// Reveals, cifras y entrada de página (BD-044, docs/09 §4 y §6). Criterios: sin JS el contenido se
// ve completo; con movimiento reducido no hay animaciones.

/** Agrega al <main> un [data-reveal] muy abajo, como lo haría una sección real. */
async function addRevealBelow(page: Page) {
  await page.evaluate(() => {
    const spacer = document.createElement("div");
    spacer.style.height = "3000px";
    const item = document.createElement("p");
    item.id = "reveal-prueba";
    item.dataset.reveal = "";
    item.textContent = "Contenido que entra al bajar";
    document.querySelector("main")!.append(spacer, item);
  });
  return page.locator("#reveal-prueba");
}

/** Anota cada vez que el contenedor de la página recibe .page-enter (la clase se quita al terminar). */
async function recordPageEnter(page: Page) {
  await page.evaluate(() => {
    const w = window as unknown as { __entradas: string[] };
    w.__entradas = [];
    const pagina = document.getElementById("pagina")!;
    new MutationObserver(() => {
      if (pagina.classList.contains("page-enter"))
        w.__entradas.push(getComputedStyle(pagina).animationDuration);
    }).observe(pagina, { attributes: true, attributeFilter: ["class"] });
  });
  return () => page.evaluate(() => (window as unknown as { __entradas: string[] }).__entradas);
}

/** El texto de la cifra durante ~600 ms (un tercio y medio de A-20), muestreado cada 50 ms. */
async function sampleCount(page: Page) {
  return page
    .locator('[data-animation="A-20"] .count-up__value')
    .first()
    .evaluate(async (el) => {
      const seen: string[] = [];
      for (let i = 0; i < 12; i++) {
        seen.push(el.textContent ?? "");
        await new Promise((r) => setTimeout(r, 50));
      }
      return seen;
    });
}

const opacity = (page: Page, selector: string) =>
  page.locator(selector).evaluate((el) => Number(getComputedStyle(el).opacity));

test.describe("movimiento", () => {
  test("reveal: oculto hasta entrar en pantalla y luego visible", async ({ page }) => {
    await page.goto("/styleguide");
    await expect(page.locator("html")).toHaveAttribute("data-reveal-ready", "");
    const item = await addRevealBelow(page);
    await expect.poll(() => opacity(page, "#reveal-prueba")).toBe(0);
    await item.scrollIntoViewIfNeeded();
    await expect(item).toHaveAttribute("data-revealed", "");
    await expect.poll(() => opacity(page, "#reveal-prueba")).toBe(1);
  });

  test("con movimiento reducido nada se oculta ni se mueve", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/styleguide");
    await expect(page.locator("html")).toHaveAttribute("data-reveal-ready", "");
    await addRevealBelow(page);
    // Todavía sin revelar, pero visible y en su lugar.
    await expect(page.locator("#reveal-prueba")).not.toHaveAttribute("data-revealed", "");
    expect(await opacity(page, "#reveal-prueba")).toBe(1);
    await expect(page.locator("#reveal-prueba")).toHaveCSS("transform", "none");
    // La cifra no cuenta: se queda en el valor final todo el tiempo.
    const row = page.locator('[data-animation="A-20"]');
    await row.getByRole("button", { name: "Reproducir" }).click();
    expect(new Set(await sampleCount(page))).toEqual(new Set(["60"]));
    // La entrada de página no se mueve (las reglas de reducido la dejan en 1 ms).
    const entradas = await recordPageEnter(page);
    await page.getByRole("link", { name: "ir a Datos de ejemplo" }).click();
    await page.waitForURL("/styleguide/datos");
    await expect.poll(entradas).toEqual(["0.001s"]);
  });

  test("un enlace enfocado dentro de un reveal oculto se ve en el acto", async ({ page }) => {
    await page.goto("/styleguide");
    await expect(page.locator("html")).toHaveAttribute("data-reveal-ready", "");
    const item = await addRevealBelow(page);
    await item.evaluate((el) => (el.innerHTML = '<a href="/">Volver al inicio</a>'));
    await expect.poll(() => opacity(page, "#reveal-prueba")).toBe(0);
    await item.getByRole("link").focus();
    await expect(item).toHaveAttribute("data-revealed", "instant");
    await expect.poll(() => opacity(page, "#reveal-prueba")).toBe(1);
  });

  test("cifra: cuenta sin cambiar de ancho (sin CLS) y termina en el valor", async ({ page }) => {
    await page.goto("/styleguide");
    const row = page.locator('[data-animation="A-20"]');
    await row.scrollIntoViewIfNeeded();
    const box = row.locator(".count-up").first();
    const before = (await box.boundingBox())!.width;
    await row.getByRole("button", { name: "Reproducir" }).click();
    await expect.poll(() => row.locator(".count-up__value").first().textContent()).not.toBe("60");
    expect((await box.boundingBox())!.width).toBe(before);
    await expect(row.locator(".count-up__value").first()).toHaveText("60");
    await expectNoA11yViolations(page);
  });

  test("entrada de página: no en la primera carga, sí al cambiar de página", async ({ page }) => {
    await page.goto("/styleguide");
    await expect(page.locator(".page-enter")).toHaveCount(0);
    const entradas = await recordPageEnter(page);
    // Dentro de la misma sección (/styleguide → /styleguide/datos): un template.tsx de (site) no
    // se volvería a montar aquí; PageEnter sí anima.
    await page.getByRole("link", { name: "ir a Datos de ejemplo" }).click();
    await page.waitForURL("/styleguide/datos");
    await expect.poll(entradas).toHaveLength(1);
    // Al terminar la animación la clase se va (no deja transform ni capa).
    await expect(page.locator(".page-enter")).toHaveCount(0);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
});

test.describe("movimiento sin JavaScript", () => {
  test("todo el contenido se ve completo", async ({ browser, baseURL }) => {
    const context = await browser.newContext({ baseURL, javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto("/styleguide");
    await expect(page.locator("html")).not.toHaveAttribute("data-reveal-ready", /.*/);
    const opacities = await page
      .locator("[data-reveal]")
      .evaluateAll((els) => els.map((el) => getComputedStyle(el).opacity));
    expect(opacities.length).toBeGreaterThan(0);
    expect(new Set(opacities)).toEqual(new Set(["1"]));
    // La cifra trae el número final en el HTML.
    await expect(page.locator('[data-animation="A-20"] .count-up__value').first()).toHaveText("60");
    await context.close();
  });
});
