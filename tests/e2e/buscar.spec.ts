import { collectConsoleErrors, expect, expectNoA11yViolations, test } from "./helpers";

// Buscador (BD-066). Criterios: «ultra», «pt00058», «759364663092» y «crayon» encuentran
// resultados; sin resultados, sugerencias y WhatsApp.

test.describe("página /buscar (BD-066)", () => {
  test("con ?q= los resultados vienen en el HTML; noindex, un h1 y pasa axe @critico", async ({
    page,
  }) => {
    const errors = collectConsoleErrors(page);
    await page.goto("/buscar?q=pt00058");
    await expect(page.getByRole("heading", { level: 1, name: "Buscar" })).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    const field = page.getByRole("searchbox", { name: "Buscar en el catálogo" });
    await expect(field).toHaveValue("pt00058");
    await expect(field).toHaveCount(1);
    await expect(page.getByText("¿Buscas el Bolik Ultra Azul (PT00058)?")).toBeVisible();
    await expect(page.getByRole("link", { name: /¿Buscas el Bolik Ultra Azul/ })).toHaveAttribute(
      "href",
      "/productos/boligrafos/bolik-ultra?color=azul",
    );
    await expectNoA11yViolations(page);
    expect(errors, "errores en la consola").toEqual([]);
  });

  for (const [query, expected] of [
    ["ultra", "Bolik Ultra"],
    ["pt00058", "Bolik Ultra"],
    ["759364663092", "Bolik Ultra"],
    ["crayon", /Crayon|Crayón/],
  ] as const)
    test(`criterio: «${query}» encuentra resultados, también sin JS`, async ({ browser }) => {
      const context = await browser.newContext({ javaScriptEnabled: false });
      const page = await context.newPage();
      await page.goto(`/buscar?q=${query}`);
      await expect(
        page
          .getByRole("list", { name: /resultados? para/ })
          .getByText(expected)
          .first(),
      ).toBeVisible();
      await context.close();
    });

  test("mientras se escribe, los resultados cambian y la URL lo sigue", async ({ page }) => {
    await page.goto("/buscar");
    const field = page.getByRole("searchbox", { name: "Buscar en el catálogo" });
    await expect(field).toBeFocused();
    await field.fill("lapicero");
    await expect(page.getByRole("list", { name: /resultados? para «lapicero»/ })).toContainText(
      "Bolik Ultra",
    );
    await expect(page).toHaveURL(/\/buscar\?q=lapicero$/);
  });

  test("sin resultados: sugerencias que buscan y WhatsApp", async ({ page }) => {
    await page.goto("/buscar?q=zzqxw");
    await expect(
      page.getByRole("paragraph").filter({ hasText: "No encontramos «zzqxw»" }),
    ).toBeVisible();
    await expect(
      page.getByRole("main").getByRole("link", { name: "Ver todo el catálogo" }),
    ).toBeVisible();
    // WhatsApp solo si hay número en los ajustes (el de ejemplo lo tiene).
    await expect(page.getByRole("link", { name: "Pregúntanos por WhatsApp" })).toHaveAttribute(
      "href",
      /wa\.me/,
    );
    await page.getByRole("main").getByRole("link", { name: "crayones", exact: true }).click();
    await expect(page.getByRole("searchbox", { name: "Buscar en el catálogo" })).toHaveValue(
      "crayones",
    );
    await expect(page.getByRole("list", { name: /resultados? para «crayones»/ })).toBeVisible();
  });

  test("con una letra pide al menos 2", async ({ page }) => {
    await page.goto("/buscar");
    await page.getByRole("searchbox", { name: "Buscar en el catálogo" }).fill("u");
    await expect(page.getByText("Escribe al menos 2 letras").first()).toBeVisible();
  });
});

test.describe("buscador instantáneo del header (BD-066)", () => {
  const dialog = (page: import("@playwright/test").Page) =>
    page.getByRole("dialog", { name: "Buscar en el catálogo" });

  /** El atajo escucha desde que la página hidrata: se repite la tecla hasta que abre. */
  const pressUntilOpen = async (page: import("@playwright/test").Page, key: string) =>
    expect(async () => {
      await page.keyboard.press(key);
      await expect(dialog(page)).toBeVisible({ timeout: 1_000 });
    }).toPass({ timeout: 10_000 });

  test("«/» lo abre con el campo enfocado; busca mientras se escribe; Escape lo cierra @critico", async ({
    page,
  }) => {
    const errors = collectConsoleErrors(page);
    await page.goto("/");
    await pressUntilOpen(page, "/");
    const field = dialog(page).getByRole("searchbox", { name: "Buscar en el catálogo" });
    await expect(field).toBeFocused();
    await field.fill("ultra");
    await expect(
      dialog(page).getByRole("list", { name: /resultados? para «ultra»/ }),
    ).toContainText("Bolik Ultra");
    await expectNoA11yViolations(page);
    await page.keyboard.press("Escape");
    await expect(dialog(page)).toBeHidden();
    expect(errors, "errores en la consola").toEqual([]);
  });

  test("Ctrl+K lo abre; un resultado lleva a la ficha y el diálogo se cierra", async ({ page }) => {
    await page.goto("/productos");
    await pressUntilOpen(page, "Control+k");
    await dialog(page).getByRole("searchbox").fill("pt00058");
    await dialog(page)
      .getByRole("link", { name: /¿Buscas el Bolik Ultra Azul/ })
      .click();
    await expect(page).toHaveURL(/\/productos\/boligrafos\/bolik-ultra\?color=azul$/);
    await expect(dialog(page)).toBeHidden();
  });

  test("el ícono del header lo abre y al cerrar devuelve el foco al ícono", async ({ page }) => {
    await page.goto("/");
    const link = page.getByRole("link", { name: "Buscar", exact: true });
    // Antes de hidratar el clic navega a /buscar: se reintenta desde la home hasta que abre.
    await expect(async () => {
      if (!page.url().endsWith("/")) await page.goto("/");
      await link.click();
      await expect(dialog(page)).toBeVisible({ timeout: 1_000 });
    }).toPass({ timeout: 15_000 });
    await page.keyboard.press("Escape");
    await expect(link).toBeFocused();
  });

  test("«/» escrito en un campo es una barra, no el atajo", async ({ page }) => {
    await page.goto("/productos");
    // Que el atajo ya escuche (hidratado): se abre y se cierra una vez.
    await pressUntilOpen(page, "/");
    await page.keyboard.press("Escape");
    await expect(dialog(page)).toBeHidden();
    const field = page.getByRole("main").getByRole("searchbox", { name: "Buscar en el catálogo" });
    // Tecla por tecla (fill no dispara keydown).
    await field.pressSequentially("a/b");
    await expect(field).toHaveValue("a/b");
    await expect(dialog(page)).toBeHidden();
  });
});

test("la 404 trae el buscador y lleva a /buscar con resultados", async ({ page }) => {
  await page.goto("/no-existe-esta-pagina");
  await expect(page.getByText("Busca un producto o vuelve al inicio")).toBeVisible();
  const field = page.getByRole("main").getByRole("searchbox", { name: "Buscar en el catálogo" });
  await field.fill("ultra");
  await page.getByRole("main").getByRole("button", { name: "Buscar" }).click();
  await expect(page).toHaveURL(/\/buscar\?q=ultra$/);
  await expect(page.getByRole("list", { name: /resultados? para «ultra»/ })).toContainText(
    "Bolik Ultra",
  );
});
