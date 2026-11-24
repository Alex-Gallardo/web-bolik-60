import type { Page } from "@playwright/test";
import { collectConsoleErrors, expect, expectNoA11yViolations, test } from "./helpers";

// Formularios de escuelas, distribuidores y contacto (BD-076) en su vitrina /styleguide/formularios
// mientras no existen sus páginas (BD-105, BD-106, BD-111). Con DATA_SOURCE=fixtures se guardan en
// memoria; tiempo mínimo de 3 s y límite por IP (BD-077).

const PATH = "/styleguide/formularios";

/** Cada prueba que envía, desde su propia IP: el límite de 5 en 10 min no se cruza. */
async function ownIp(page: Page) {
  const n = () => Math.floor(Math.random() * 250) + 1;
  await page.setExtraHTTPHeaders({ "x-forwarded-for": `10.${n()}.${n()}.${n()}` });
}

const region = (page: Page, name: string) => page.getByRole("region", { name });
const school = (page: Page) => region(page, "Lleva Bolik a tu escuela");
const distributor = (page: Page) => region(page, "Quiero ser distribuidor");
const contact = (page: Page) => region(page, "Contacto");
const dialog = (page: Page) => page.getByRole("alertdialog").or(page.getByRole("dialog"));

const events = (page: Page, name: string) =>
  page.evaluate(
    (event) =>
      ((window as unknown as { dataLayer?: Record<string, unknown>[] }).dataLayer ?? []).filter(
        (e) => e.event === event,
      ),
    name,
  );

async function fillSchool(page: Page) {
  const form = school(page);
  await form.getByLabel(/^Nombre del colegio/).fill("Colegio El Progreso");
  await form.getByRole("radio", { name: "Primaria", exact: true }).check();
  await form.getByLabel(/^Alumnos aproximados/).fill("120");
  await form.getByLabel(/^Departamento/).selectOption("quetzaltenango");
  await form.getByLabel(/^Municipio/).fill("Quetzaltenango");
  await form.getByLabel(/^Tu nombre/).fill("Ana López");
  await form.getByLabel(/^Teléfono/).fill("5555 1234");
  await form.getByLabel(/^Mes preferido/).selectOption("febrero");
}

test.describe("formularios de solicitudes (BD-076)", () => {
  test("los tres formularios: un h1, noindex y pasan axe @critico", async ({ page }) => {
    await page.goto(PATH);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    for (const name of ["Enviar solicitud", "Enviar mensaje"])
      await expect(page.getByRole("button", { name }).first()).toBeVisible();
    await expect(school(page).getByLabel(/^Teléfono/)).toHaveAttribute("type", "tel");
    await expectNoA11yViolations(page);
  });

  test("enviar vacío: errores junto a cada campo, foco en el primero y aviso", async ({ page }) => {
    await page.goto(PATH);
    await school(page).getByRole("button", { name: "Enviar solicitud" }).click();
    await expect(page.getByText("Revisa los campos marcados").first()).toBeVisible();
    await expect(school(page).getByLabel(/^Nombre del colegio/)).toBeFocused();
    await expect(school(page).getByText("Este dato es necesario").first()).toBeVisible();
    await expect(school(page).getByText("Déjanos al menos un teléfono o un correo")).toHaveCount(2);
  });

  test("escuela: diálogo festivo con folio ESC, confeti y evento; el formulario queda vacío @critico", async ({
    page,
  }) => {
    const errors = collectConsoleErrors(page);
    await ownIp(page);
    await page.goto(PATH);
    await fillSchool(page);
    await page.waitForTimeout(3_100);
    await school(page).getByRole("button", { name: "Enviar solicitud" }).click();
    await expect(dialog(page)).toContainText("¡Qué emoción, Colegio El Progreso!");
    await expect(dialog(page)).toContainText(/ESC-\d{4}-\d{6}/);
    await expect(dialog(page).locator(".confetti")).toHaveCount(1);
    expect(await events(page, "school_request_submit")).toEqual([
      { event: "school_request_submit", level: "primaria", department: "quetzaltenango" },
    ]);
    await dialog(page).getByRole("button", { name: "Listo" }).click();
    await expect(dialog(page)).toHaveCount(0);
    await expect(school(page).getByLabel(/^Nombre del colegio/)).toHaveValue("");
    expect(errors, "errores en la consola").toEqual([]);
  });

  test("distribuidor: diálogo con folio DIS y evento, sin confeti", async ({ page }) => {
    await ownIp(page);
    await page.goto(PATH);
    const form = distributor(page);
    await form.getByLabel(/^Nombre del negocio/).fill("Librería La Esquina");
    await form.getByRole("radio", { name: "Tienda" }).check();
    await form.getByLabel(/^NIT/).fill("1234567-K");
    await form.getByLabel(/^Departamento/).selectOption("guatemala");
    await form.getByLabel(/^Municipio/).fill("Mixco");
    await form.getByLabel(/^Tu nombre/).fill("Luis Pérez");
    await form.getByLabel(/^Correo/).fill("luis@ejemplo.com");
    await page.waitForTimeout(3_100);
    await form.getByRole("button", { name: "Enviar solicitud" }).click();
    await expect(dialog(page)).toContainText("Gracias por tu interés en vender Bolik");
    await expect(dialog(page)).toContainText(/DIS-\d{4}-\d{6}/);
    await expect(dialog(page).locator(".confetti")).toHaveCount(0);
    expect(await events(page, "distributor_submit")).toEqual([
      { event: "distributor_submit", business_type: "tienda", department: "guatemala" },
    ]);
  });

  test("contacto: «Mensaje enviado» y evento con el asunto", async ({ page }) => {
    await ownIp(page);
    await page.goto(PATH);
    const form = contact(page);
    await form.getByLabel(/^Asunto/).selectOption("productos");
    await form.getByLabel(/^Tu nombre/).fill("Marta Gómez");
    await form.getByLabel(/^Teléfono/).fill("5555 9876");
    await form.getByLabel(/^Mensaje/).fill("¿Tienen lapiceros de tinta gel en morado?");
    await page.waitForTimeout(3_100);
    await form.getByRole("button", { name: "Enviar mensaje" }).click();
    await expect(dialog(page)).toContainText("Mensaje enviado");
    expect(await events(page, "contact_submit")).toEqual([
      { event: "contact_submit", subject: "productos" },
    ]);
  });

  test("campo trampa lleno: el bot ve el éxito (folio falso) y no llega correo", async ({
    page,
  }) => {
    await ownIp(page);
    await page.goto(PATH);
    await fillSchool(page);
    await school(page)
      .getByLabel(/^Nombre del colegio/)
      .fill("Colegio Trampa BD-076");
    await school(page)
      .locator('input[name="website"]')
      .evaluate((input: HTMLInputElement) => (input.value = "http://spam.example"));
    await page.waitForTimeout(3_100);
    await school(page).getByRole("button", { name: "Enviar solicitud" }).click();
    await expect(dialog(page)).toContainText(/ESC-\d{4}-\d{6}/);
    // El éxito falso no cuenta como conversión.
    expect(await events(page, "school_request_submit")).toEqual([]);
    await dialog(page).getByRole("button", { name: "Listo" }).click();

    // Uno normal después: cuando su correo ya está en la bandeja, el de la trampa tampoco tardó.
    await fillSchool(page);
    await school(page)
      .getByLabel(/^Nombre del colegio/)
      .fill("Colegio Control BD-076");
    await page.waitForTimeout(3_100);
    await school(page).getByRole("button", { name: "Enviar solicitud" }).click();
    await expect(dialog(page)).toContainText("¡Qué emoción, Colegio Control BD-076!");
    await expect(async () => {
      await page.goto("/styleguide/correos");
      await expect(page.locator("main")).toContainText("Colegio Control BD-076");
    }).toPass({ timeout: 15_000 });
    await expect(page.locator("main")).not.toContainText("Colegio Trampa BD-076");
  });

  test("los correos de la solicitud de visita se ven en la bandeja de prueba", async ({ page }) => {
    await ownIp(page);
    await page.goto(PATH);
    await fillSchool(page);
    await school(page)
      .getByLabel(/^Correo/)
      .fill("ana.e2e@ejemplo.com");
    await page.waitForTimeout(3_100);
    await school(page).getByRole("button", { name: "Enviar solicitud" }).click();
    const folio = (await dialog(page).textContent())?.match(/ESC-\d{4}-\d{6}/)?.[0];
    expect(folio).toBeTruthy();
    // Los correos salen después de responder (after()): se espera a que aparezcan.
    await expect(async () => {
      await page.goto("/styleguide/correos");
      await expect(page.locator("main")).toContainText(`Nueva solicitud de visita ${folio}`);
      await expect(page.locator("main")).toContainText(`Recibimos tu solicitud de visita ${folio}`);
    }).toPass({ timeout: 15_000 });
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
