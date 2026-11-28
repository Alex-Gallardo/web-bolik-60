import type { Page } from "@playwright/test";
import { collectConsoleErrors, expect, expectNoA11yViolations, test } from "./helpers";

// Bolik en tu escuela (BD-105, docs/06 §3.9). Con DATA_SOURCE=fixtures: las 4 actividades de la
// demo (sample); sin preguntas de escuelas, cifras de escuelas publicadas ni kits.

const PATH = "/escuelas";

/** Cada envío desde su IP: el límite de 5 en 10 min no se cruza (BD-077). */
async function ownIp(page: Page) {
  const n = () => Math.floor(Math.random() * 250) + 1;
  await page.setExtraHTTPHeaders({ "x-forwarded-for": `10.${n()}.${n()}.${n()}` });
}

const form = (page: Page) => page.getByRole("region", { name: "Lleva Bolik a tu escuela" });

test.describe("Bolik en tu escuela (BD-105)", () => {
  test("un h1, migas, pasos, actividades, JSON-LD y sin errores de axe @critico", async ({
    page,
  }) => {
    const errors = collectConsoleErrors(page);
    await page.goto(PATH);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "¡Aprender a escribir es una aventura!",
    );
    await expect(page).toHaveTitle(/^Bolik en tu escuela: talleres y actividades/);
    await expect(page.getByRole("navigation", { name: "Migas de pan" })).toBeVisible();
    // Baloo 2 en los títulos (la tercera familia, solo aquí).
    await expect(page.getByRole("heading", { level: 1 })).toHaveCSS(
      "font-family",
      /Baloo|__Baloo|baloo/i,
    );
    await expect(page.getByText("Sin costo para la institución.", { exact: false })).toBeVisible();
    await expect(
      page.getByRole("region", { name: "Cómo funciona" }).getByRole("listitem"),
    ).toHaveCount(4);
    await expect(
      page.getByRole("region", { name: "Actividades para escuelas" }).getByRole("article"),
    ).toHaveCount(4);

    const types = await page
      .locator('script[type="application/ld+json"]')
      .evaluateAll((nodes) => nodes.map((n) => JSON.parse(n.textContent ?? "{}")["@type"]));
    expect(types).toEqual(expect.arrayContaining(["BreadcrumbList"]));
    // Sin preguntas de alcance escuelas (la de doc 17 §7 espera su respuesta): ni sección ni FAQPage.
    expect(types).not.toContain("FAQPage");
    await expect(page.getByRole("region", { name: "Preguntas frecuentes" })).toHaveCount(0);
    // Sin cifras de escuelas publicadas ni kits activos: esas secciones no aparecen.
    await expect(page.getByRole("region", { name: "Bolik en las escuelas" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Ver kits escolares" })).toHaveCount(0);

    await expectNoA11yViolations(page);
    expect(errors, "errores en la consola").toEqual([]);
  });

  test("el botón del hero baja al formulario", async ({ page }) => {
    await page.goto(PATH);
    await page.getByRole("link", { name: "Lleva Bolik a tu escuela" }).first().click();
    await expect(page).toHaveURL(/#solicitud$/);
    await expect(form(page).getByLabel(/^Nombre del colegio/)).toBeInViewport();
  });

  test("enviar la solicitud: diálogo con folio ESC @critico", async ({ page }) => {
    await ownIp(page);
    await page.goto(PATH);
    // El formulario se descarga al acercarse (school-form-loader.tsx): se baja hasta él.
    await form(page).scrollIntoViewIfNeeded();
    const f = form(page);
    await f.getByLabel(/^Nombre del colegio/).fill("Colegio Prueba BD-105");
    await f.getByRole("radio", { name: "Primaria", exact: true }).check();
    await f.getByLabel(/^Departamento/).selectOption("quetzaltenango");
    await f.getByLabel(/^Municipio/).fill("Quetzaltenango");
    await f.getByLabel(/^Tu nombre/).fill("Ana López");
    await f.getByLabel(/^Teléfono/).fill("5555 1234");
    // Tiempo mínimo de llenado (3 s, BD-076).
    await page.waitForTimeout(3_100);
    await f.getByRole("button", { name: "Enviar solicitud" }).click();
    await expect(page.getByRole("alertdialog").or(page.getByRole("dialog"))).toContainText(
      /ESC-\d{4}-\d{6}/,
    );
  });

  test("el formulario no viene en la carga inicial: se descarga al acercarse", async ({ page }) => {
    await page.goto(PATH);
    await page.waitForLoadState("load");
    await expect(form(page).getByLabel(/^Nombre del colegio/)).toHaveCount(0);
    await form(page).scrollIntoViewIfNeeded();
    await expect(form(page).getByLabel(/^Nombre del colegio/)).toBeVisible();
  });

  test("con el interruptor de movimiento reducido del sitio, tampoco flotan", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(PATH);
    await page.evaluate(() => document.documentElement.setAttribute("data-reduced-motion", ""));
    const names = await page
      .locator(".kids-float")
      .evaluateAll((nodes) => nodes.map((n) => getComputedStyle(n).animationName));
    expect(new Set(names)).toEqual(new Set(["none"]));
  });

  test("con movimiento reducido las figuras no flotan", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(PATH);
    const names = await page
      .locator(".kids-float")
      .evaluateAll((nodes) => nodes.map((n) => getComputedStyle(n).animationName));
    expect(names.length).toBeGreaterThan(0);
    expect(new Set(names)).toEqual(new Set(["none"]));
  });

  test("la home enlaza a /escuelas", async ({ page }) => {
    await page.goto("/");
    await page
      .getByRole("region", { name: "Bolik en tu escuela" })
      .getByRole("link", { name: "Lleva Bolik a tu escuela" })
      .click();
    await expect(page).toHaveURL(/\/escuelas$/);
  });

  test.describe("móvil", () => {
    test.use({ viewport: { width: 360, height: 800 } });
    test("a 360 px nada desborda ni entra en el margen", async ({ page }) => {
      await page.goto(PATH);
      const tooWide = await page.evaluate(() => {
        const limit = document.documentElement.clientWidth - 16 + 0.5;
        return [...document.querySelectorAll<HTMLElement>("main a, main button, main h1, main h2")]
          .filter((el) => el.offsetParent && !el.closest(".sr-only"))
          .filter((el) => el.getBoundingClientRect().right > limit)
          .map((el) => el.textContent?.trim());
      });
      expect(tooWide).toEqual([]);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });
  });
});

test.describe("Bolik en tu escuela sin JavaScript (BD-105)", () => {
  test.use({ javaScriptEnabled: false });

  test("se ve todo y el formulario avisa que necesita JavaScript", async ({ page }) => {
    await page.goto(PATH);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByText(/Para enviar este formulario activa JavaScript/)).toBeVisible();
    await expect(
      page.getByRole("region", { name: "Actividades para escuelas" }).getByRole("article"),
    ).toHaveCount(4);
  });
});
