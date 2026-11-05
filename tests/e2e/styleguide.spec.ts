import { collectConsoleErrors, expect, expectNoA11yViolations, test } from "./helpers";

// /styleguide (BD-026, docs/08 §6): las 13 secciones con su ancla e índice, sin errores de
// consola, accesible, y el interruptor de movimiento reducido aplica las reglas a toda la página.
const SECTIONS = [
  "marca",
  "color",
  "tipografia",
  "espacios",
  "fondos",
  "botones",
  "formularios",
  "tarjetas",
  "navegacion",
  "feedback",
  "movimiento",
  "dominio",
  "iconos",
];

test.describe("styleguide", () => {
  test("las 13 secciones renderizan sin errores de consola y pasan axe", async ({ page }) => {
    const errors = collectConsoleErrors(page);
    const response = await page.goto("/styleguide");
    expect(response?.status()).toBe(200);
    expect(response?.headers()["x-robots-tag"]).toContain("noindex");
    for (const id of SECTIONS) {
      const section = page.locator(`section#${id}`);
      await expect(section, id).toHaveCount(1);
      await expect(section.getByRole("heading", { level: 2 })).toBeVisible();
    }
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    // Ids únicos: un id repetido deja etiquetas y aria-* apuntando al elemento equivocado.
    const duplicated = await page.evaluate(() => {
      const ids = [...document.querySelectorAll("[id]")].map((el) => el.id);
      return ids.filter((id, i) => ids.indexOf(id) !== i);
    });
    expect(duplicated, "ids repetidos").toEqual([]);
    // Los colores muestran su contraste calculado (en el navegador).
    await expect(page.locator('[data-token="blue"] [data-contrast="paper"]')).toContainText(/AA/);
    await expectNoA11yViolations(page);
    expect(errors, "errores en la consola").toEqual([]);
  });

  test("el índice enlaza cada sección (desplegable en móvil)", async ({ page }, testInfo) => {
    await page.goto("/styleguide");
    const nav = page.getByRole("navigation", { name: "Secciones del styleguide" });
    if (testInfo.project.name === "movil") {
      await expect(nav).toBeHidden();
      await page.locator("summary", { hasText: "Secciones" }).click();
    }
    await expect(nav).toBeVisible();
    const links = nav.getByRole("link");
    await expect(links).toHaveCount(SECTIONS.length + 1);
    for (const [index, id] of SECTIONS.entries())
      await expect(links.nth(index)).toHaveAttribute("href", `#${id}`);
    await nav.getByRole("link", { name: /Movimiento/ }).click();
    await expect(page).toHaveURL(/#movimiento$/);
  });

  test("«Simular movimiento reducido» aplica las reglas a toda la página", async ({ page }) => {
    await page.goto("/styleguide");
    const toggle = page.getByRole("switch", { name: "Simular movimiento reducido" });
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-checked", "true");
    await expect(page.locator("html")).toHaveAttribute("data-reduced-motion", "");
    // El diálogo se dibuja fuera de la sección (portal) y aun así solo cambia de opacidad.
    await page
      .locator('[data-animation="A-09"]')
      .getByRole("button", { name: "Abrir diálogo" })
      .click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    expect(await dialog.evaluate((el) => getComputedStyle(el).animationName)).toBe("fade-in");
    await page.keyboard.press("Escape");
    await toggle.click();
    await expect(page.locator("html")).not.toHaveAttribute("data-reduced-motion");
  });

  test("Reproducir vuelve a correr la animación", async ({ page }) => {
    await page.goto("/styleguide");
    const row = page.locator('[data-animation="A-05"]');
    await expect(row.getByText("1", { exact: true })).toBeVisible();
    await row.getByRole("button", { name: "Reproducir" }).click();
    await expect(row.getByText("2", { exact: true })).toHaveClass(/badge-pop/);
  });
});
