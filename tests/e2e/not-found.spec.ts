import { expect, test } from "@playwright/test";
import { expectNoA11yViolations } from "./helpers";

// Páginas 404 y 500 (BD-046). Con DATA_SOURCE=fixtures no hay redirecciones: el 301 se prueba en
// tests/integration/redirects.test.ts y src/proxy.test.ts.

test.describe("404", () => {
  test("ayuda a seguir navegando: inicio, catálogo, dónde comprar y líneas", async ({ page }) => {
    const response = await page.goto("/no-existe-bd046");
    expect(response?.status()).toBe(404);
    await expect(page).toHaveTitle("Página no encontrada | Bolik");
    await expect(page.locator('meta[name="robots"]')).toHaveCount(1);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    const links = page.getByRole("navigation", { name: "Sigue por aquí" });
    await expect(links.getByRole("link", { name: "Volver al inicio" })).toHaveAttribute(
      "href",
      "/",
    );
    await expect(links.getByRole("link", { name: "Ver el catálogo" })).toHaveAttribute(
      "href",
      "/productos",
    );
    await expect(links.getByRole("link", { name: "Dónde comprar" })).toHaveAttribute(
      "href",
      "/donde-comprar",
    );
    const lines = page.getByRole("navigation", { name: "Líneas de producto" });
    await expect(lines.getByRole("link", { name: "Bolígrafos" })).toHaveAttribute(
      "href",
      "/productos/boligrafos",
    );
    await expectNoA11yViolations(page);
  });

  test("avisa al servidor qué ruta no existe", async ({ page }) => {
    const beacon = page.waitForRequest(
      (request) => request.url().endsWith("/api/not-found") && request.method() === "POST",
    );
    await page.goto("/no-existe-bd046?b=2&a=1");
    const body = JSON.parse((await beacon).postData() ?? "{}") as { p?: string };
    expect(body.p).toBe("/no-existe-bd046?b=2&a=1");
  });
});

test.describe("500", () => {
  test("ofrece reintentar y llamar, con los datos del sitio", async ({ page }) => {
    await page.goto("/styleguide");
    await page.getByRole("button", { name: "Provocar un error" }).click();
    await expect(page.getByRole("button", { name: "Intentar de nuevo" })).toBeVisible();
    // Teléfono de SiteSetting; WhatsApp solo aparece cuando hay número (hoy no).
    await expect(page.getByRole("link", { name: /^Llámanos al / })).toHaveAttribute(
      "href",
      /^tel:\+502/,
    );
    await expect(page.getByRole("link", { name: "Escríbenos por WhatsApp" })).toHaveCount(0);
  });
});

test.describe("barra final (proxy, BD-046)", () => {
  test("una ruta con barra final responde un solo 308 a la ruta sin ella", async ({ request }) => {
    const response = await request.get("/styleguide/?x=1", { maxRedirects: 0 });
    expect(response.status()).toBe(308);
    // Next deja el Location relativo cuando el destino es del mismo origen: se resuelve con una base.
    const location = new URL(response.headers().location!, "http://base.invalid");
    expect(location.pathname).toBe("/styleguide");
    expect(location.search).toBe("?x=1");
  });
});
