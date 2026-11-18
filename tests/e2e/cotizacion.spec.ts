import type { Page } from "@playwright/test";
import { collectConsoleErrors, expect, expectNoA11yViolations, test } from "./helpers";

// Página /cotizacion y su formulario (BD-072): ≤ 6 campos obligatorios y teclado numérico en el
// teléfono. Envío (BD-073): con DATA_SOURCE=fixtures la cotización se guarda en memoria con su
// folio; tiempo mínimo de 3 s y límite por IP.

const ULTRA = "/productos/boligrafos/bolik-ultra";

const line = (ref: string, color: string, quantity: number) => ({
  key: `variante:${ref}:cajilla12`,
  type: "variante",
  ref,
  name: "Bolik Ultra",
  detail: `${color} · ${ref}`,
  packaging: "cajilla12",
  quantity,
  url: ULTRA,
  addedAt: 1,
});

/** Cotización guardada antes de cargar (solo la primera carga: al recargar manda la página). */
async function seedQuote(page: Page) {
  const value = JSON.stringify({
    state: { lines: [line("PT00058", "Azul", 20), line("PT00059", "Negro", 5)] },
    version: 1,
  });
  await page.addInitScript((stored) => {
    if (!window.sessionStorage.getItem("seeded")) {
      window.localStorage.setItem("bolik_quote", stored);
      window.sessionStorage.setItem("seeded", "1");
    }
  }, value);
}

/** Líneas de la cotización (no los <li> del header y el pie). */
const items = (page: Page) =>
  page.getByRole("list", { name: "Productos de tu cotización" }).getByRole("listitem");

/**
 * Cada prueba que envía, desde su propia IP (X-Forwarded-For; sin IIS delante, el servidor la toma
 * tal cual): el límite de 5 envíos en 10 minutos por IP no se cruza entre pruebas.
 */
async function ownIp(page: Page) {
  const n = () => Math.floor(Math.random() * 250) + 1;
  await page.setExtraHTTPHeaders({ "x-forwarded-for": `10.${n()}.${n()}.${n()}` });
}

/** Datos válidos (las líneas sembradas existen en el catálogo de ejemplo). */
async function fillValid(page: Page) {
  await page.getByRole("radio", { name: "Librería o tienda" }).check();
  await page.getByLabel(/^Nombre de la institución/).fill("Librería El Estudiante");
  await page.getByLabel(/^Tu nombre/).fill("Ana López");
  await page.getByLabel("Teléfono", { exact: false }).first().fill("5555 1234");
  await page.getByLabel(/^Departamento/).selectOption("quetzaltenango");
}

const form = (page: Page) => page.locator("form").filter({ hasText: "Enviar cotización" });

test.describe("página /cotizacion (BD-072)", () => {
  test("lista y formulario: un h1, noindex, ≤ 6 obligatorios, teléfono numérico y pasa axe @critico", async ({
    page,
  }) => {
    const errors = collectConsoleErrors(page);
    await seedQuote(page);
    await page.goto("/cotizacion");
    await expect(page.getByRole("heading", { level: 1, name: "Mi cotización" })).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    await expect(page.getByRole("list", { name: "Productos de tu cotización" })).toBeVisible();
    await expect(items(page)).toHaveCount(2);

    // Obligatorios, exactos: tipo, institución, nombre y departamento, más «teléfono o correo»
    // (uno de los dos, sin required en ninguno) = 5 de 6 (criterio del ticket).
    const required = await form(page)
      .locator("input[required], select[required], textarea[required]")
      .evaluateAll((els) => [...new Set(els.map((el) => el.getAttribute("name")))].sort());
    expect(required).toEqual(["customerType", "department", "name", "organization"]);
    expect(
      required.length + 1,
      "campos obligatorios, contando «teléfono o correo»",
    ).toBeLessThanOrEqual(6);

    const phone = page.getByLabel("Teléfono", { exact: false }).first();
    await expect(phone).toHaveAttribute("type", "tel");
    await expect(phone).toHaveAttribute("inputmode", "tel");
    await expectNoA11yViolations(page);
    expect(errors, "errores en la consola").toEqual([]);
  });

  test("enviar vacío: errores junto a cada campo, foco en el primero y aviso", async ({ page }) => {
    await seedQuote(page);
    await page.goto("/cotizacion");
    await page.getByRole("button", { name: "Enviar cotización" }).click();
    await expect(page.getByRole("radio", { name: "Librería o tienda" })).toBeFocused();
    await expect(page.getByText("Déjanos al menos un teléfono o un correo")).toHaveCount(2);
    await expect(page.getByText("Revisa los campos marcados").first()).toBeVisible();
    await expect(page.getByRole("radiogroup", { name: /Tipo de cliente/ })).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });

  test("«Otro» no pide institución; ?tipo=empresa la elige al llegar", async ({ page }) => {
    await seedQuote(page);
    await page.goto("/cotizacion?tipo=empresa");
    await expect(page.getByRole("radio", { name: "Empresa" })).toBeChecked();
    await expect(page.getByLabel(/^Nombre de la institución/)).not.toHaveAccessibleName(/opcional/);
    await page.getByRole("radio", { name: "Otro" }).check();
    await expect(page.getByLabel(/^Nombre de la institución/)).toHaveAccessibleName(/opcional/);
  });

  test("?tipo= gana sobre el borrador: el CTA que se acaba de tocar manda", async ({ page }) => {
    await seedQuote(page);
    await page.goto("/cotizacion");
    await page.getByRole("radio", { name: "Librería o tienda" }).check();
    await page.goto("/cotizacion?tipo=empresa");
    await expect(page.getByRole("radio", { name: "Empresa" })).toBeChecked();
  });

  test("enviar con Enter desde un campo conserva el aviso «teléfono o correo»", async ({
    page,
  }) => {
    await seedQuote(page);
    await page.goto("/cotizacion?tipo=libreria");
    await page.getByLabel(/^Nombre de la institución/).fill("Librería El Estudiante");
    await page.getByLabel(/^Departamento/).selectOption("quetzaltenango");
    const name = page.getByLabel(/^Tu nombre/);
    await name.fill("Ana López");
    await name.press("Enter");
    // Único error: teléfono o correo. El foco va al teléfono y el aviso sigue en los dos campos.
    await expect(page.getByLabel("Teléfono", { exact: false }).first()).toBeFocused();
    await expect(page.getByText("Déjanos al menos un teléfono o un correo")).toHaveCount(2);
  });

  test("enviar: diálogo con el folio, la cotización y el borrador quedan vacíos @critico", async ({
    page,
  }) => {
    const errors = collectConsoleErrors(page);
    await ownIp(page);
    await seedQuote(page);
    await page.goto("/cotizacion");
    await fillValid(page);
    // Tiempo mínimo de llenado (BD-073): antes de 3 s, el servidor no la acepta.
    await page.waitForTimeout(3_100);
    await page.getByRole("button", { name: "Enviar cotización" }).click();
    const dialog = page.getByRole("alertdialog").or(page.getByRole("dialog"));
    await expect(dialog).toContainText("¡Listo! Recibimos tu cotización");
    await expect(dialog).toContainText(/COT-\d{4}-\d{6}/);
    await expect(page.locator("[data-quote-link]")).toHaveAttribute("aria-label", "Mi cotización");
    await dialog.getByRole("button", { name: "Seguir viendo productos" }).click();
    await expect(page).toHaveURL(/\/productos$/);
    expect(await page.evaluate(() => sessionStorage.getItem("bolik_quote_form"))).toBeNull();
    expect(errors, "errores en la consola").toEqual([]);
  });

  test("los correos de la cotización se ven en la bandeja de prueba (BD-074)", async ({ page }) => {
    await ownIp(page);
    await seedQuote(page);
    await page.goto("/cotizacion");
    await fillValid(page);
    await page.getByLabel(/^Correo/).fill("ana@ejemplo.com");
    await page.waitForTimeout(3_100);
    await page.getByRole("button", { name: "Enviar cotización" }).click();
    const dialog = page.getByRole("alertdialog").or(page.getByRole("dialog"));
    await expect(dialog).toContainText("¡Listo! Recibimos tu cotización");
    const folio = (await dialog.textContent())!.match(/COT-\d{4}-\d{6}/)![0];

    // Los correos salen después de responder: se espera a que aparezcan en la bandeja. Sin base, el
    // folio en memoria vuelve a empezar con cada arranque del servidor y la bandeja puede tener uno
    // igual de una corrida anterior: los más nuevos van primero.
    const inbox = page.locator("section", { has: page.locator("#bandeja") });
    await expect(async () => {
      await page.goto("/styleguide/correos");
      await expect(
        inbox.getByText(`Nueva cotización ${folio} · Librería o tienda`).first(),
      ).toBeVisible();
      await expect(inbox.getByText(`Recibimos tu cotización ${folio}`).first()).toBeVisible();
    }).toPass({ timeout: 15_000 });
    // axe sobre la página, sin los iframes de cada correo: con sandbox vacío (sin scripts, a propósito)
    // axe no puede entrar y se queda esperando; el HTML de las plantillas tiene sus propias pruebas.
    await page.evaluate(() => document.querySelectorAll("iframe").forEach((f) => f.remove()));
    await expectNoA11yViolations(page);
  });

  test("enviar antes de 3 s: aviso «Dale un momento más» y nada se pierde", async ({ page }) => {
    await ownIp(page);
    await seedQuote(page);
    await page.goto("/cotizacion");
    await fillValid(page);
    await page.getByRole("button", { name: "Enviar cotización" }).click();
    await expect(page.getByText("Dale un momento más antes de enviar").first()).toBeVisible();
    await expect(items(page)).toHaveCount(2);
    await expect(page.getByLabel(/^Tu nombre/)).toHaveValue("Ana López");
  });

  test("quitar una línea con «Deshacer» del toast", async ({ page }) => {
    await seedQuote(page);
    await page.goto("/cotizacion");
    await page.getByRole("button", { name: "Quitar Bolik Ultra Azul · PT00058" }).click();
    await expect(items(page)).toHaveCount(1);
    await page.getByRole("button", { name: "Deshacer" }).click();
    await expect(items(page)).toHaveCount(2);
    await expect(items(page).first()).toContainText("Azul · PT00058");
  });

  test("sin productos: estado vacío con el catálogo, sin formulario", async ({ page }) => {
    await page.goto("/cotizacion");
    await expect(page.getByText("Tu cotización está vacía")).toBeVisible();
    await expect(page.getByRole("link", { name: "Ver el catálogo" })).toHaveAttribute(
      "href",
      "/productos",
    );
    await expect(page.getByRole("button", { name: "Enviar cotización" })).toHaveCount(0);
  });

  test("en /cotizacion, «Mi cotización» del header no abre el drawer encima", async ({ page }) => {
    await seedQuote(page);
    await page.goto("/cotizacion");
    await expect(items(page)).toHaveCount(2);
    await page.getByRole("link", { name: "Mi cotización, 2 productos" }).click();
    await expect(page.getByRole("dialog", { name: "Mi cotización" })).toHaveCount(0);
    await expect(page).toHaveURL(/\/cotizacion$/);
  });

  test.describe("móvil", () => {
    test.use({ viewport: { width: 360, height: 740 } });

    test("a 360 px no hay scroll horizontal", async ({ page }) => {
      await seedQuote(page);
      await page.goto("/cotizacion");
      await expect(page.getByRole("button", { name: "Enviar cotización" })).toBeAttached();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(360);
    });
  });
});
