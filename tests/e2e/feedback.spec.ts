import { feedback } from "../../src/content/feedback";
import { collectConsoleErrors, expect, expectNoA11yViolations, test } from "./helpers";

// Matriz de feedback (BD-024, docs/08 §4): cada fila con su ejemplo, toasts anunciados por
// aria-live, diálogos con foco atrapado y devuelto, y aviso de sin conexión real.
test.describe("feedback", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/styleguide/feedback");
  });

  test("las 24 filas de la matriz tienen ejemplo y la vitrina pasa axe", async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await page.reload();
    await expect(page.locator("[data-row]")).toHaveCount(24);
    // sonner no se carga hasta el primer toast (docs/12 §2).
    await expect(page.locator("[data-sonner-toaster]")).toHaveCount(0);
    await expectNoA11yViolations(page);
    expect(errors, "errores en la consola").toEqual([]);
  });

  test("toast: se ve, se anuncia una vez y su acción funciona", async ({ page }) => {
    const row = page.locator('[data-row="Quitar línea"]');
    await row.getByRole("button", { name: "Quitar" }).click();
    const text = feedback.quote.removed("Bolik Ultra").title;
    await expect(page.locator("[data-sonner-toast]").getByText(text)).toBeVisible();
    await expect(page.locator('[data-feedback-live="polite"]')).toHaveText(text);
    // La región de sonner no anuncia (la nuestra ya lo hizo).
    await expect(page.getByRole("region", { name: /^Avisos/ })).toHaveAttribute("aria-live", "off");
    await page.locator("[data-sonner-toast]").getByRole("button", { name: "Deshacer" }).click();
    await expect(row.getByRole("button", { name: "Quitar" })).toBeVisible();
  });

  test("diálogo: foco dentro, Escape cierra y el foco vuelve al botón", async ({ page }) => {
    const trigger = page.getByRole("button", { name: "Ver diálogo de éxito" });
    await trigger.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { level: 2 })).toHaveText(
      feedback.quote.sent("x").title,
    );
    await expect(dialog).toContainText(/COT-\d{4}-\d{6}/);
    await expect(dialog.getByRole("button", { name: "Ver resumen" })).toBeFocused();
    // El foco no sale del diálogo.
    for (let i = 0; i < 3; i++) await page.keyboard.press("Tab");
    expect(await dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true);
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });

  test("reintento: ocupado no cierra con Escape y luego muestra un solo diálogo", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Ver diálogo de error" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "Intentar de nuevo" }).click();
    await expect(dialog).toHaveAttribute("aria-busy", "true");
    await page.keyboard.press("Escape");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("heading", { level: 2 })).toHaveText(
      feedback.quote.sent("x").title,
    );
    await expect(page.getByRole("dialog")).toHaveCount(1);
  });

  test("sin conexión: aviso persistente y, al volver, conexión recuperada", async ({
    page,
    context,
  }) => {
    // Sin interactuar antes: sonner no está descargado y sin red no se podría. El aviso lo dibuja
    // FeedbackHost y se anuncia.
    await context.setOffline(true);
    const notice = page.locator("[data-offline-notice]");
    await expect(notice).toContainText(feedback.system.offline.title);
    await expect(page.locator('[data-feedback-live="polite"]')).toContainText(
      feedback.system.offline.title,
    );
    await context.setOffline(false);
    await expect(notice).toHaveCount(0);
    await expect(
      page.locator("[data-sonner-toast]").getByText(feedback.system.online.title),
    ).toBeVisible();
  });

  test("en móvil el diálogo es un bottom sheet y el toast no tapa la barra inferior", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "movil", "solo en móvil");
    await page.getByRole("button", { name: "Descargar ficha técnica" }).click();
    const toast = page.locator("[data-sonner-toast]").first();
    await expect(toast).toBeVisible();
    const viewport = page.viewportSize()!;
    const barHeight = await page.evaluate(
      () =>
        parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--mobile-bar-h")) *
        parseFloat(getComputedStyle(document.documentElement).fontSize),
    );
    await expect
      .poll(async () => (await toast.boundingBox())!.y + (await toast.boundingBox())!.height)
      .toBeLessThanOrEqual(viewport.height - barHeight);

    await page.getByRole("button", { name: "Ver diálogo de distribuidor" }).click();
    const dialog = page.getByRole("dialog");
    await expect
      .poll(async () => {
        const box = (await dialog.boundingBox())!;
        return Math.round(box.y + box.height);
      })
      .toBe(viewport.height);
  });

  test("con movimiento reducido el diálogo solo cambia de opacidad y sin confeti", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.getByRole("button", { name: "Ver diálogo festivo" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    expect(await dialog.evaluate((el) => getComputedStyle(el).animationName)).toBe("fade-in");
    await expect(page.locator(".confetti")).toBeHidden();
  });

  test("error inesperado: pantalla amable con reintento", async ({ page }) => {
    await page.getByRole("button", { name: "Provocar un error" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      feedback.system.genericError.title,
    );
    await page.getByRole("button", { name: feedback.system.genericError.primary }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Feedback");
  });
});
