import { collectConsoleErrors, expect, test } from "./helpers";

// Acceso por QR /p/[codigo] (BD-065, docs/06 §3.5): el código del empaque abre la ficha correcta.

const ULTRA = "/productos/boligrafos/bolik-ultra";

test.describe("acceso por QR (BD-065)", () => {
  test("SKU, código de barras y SKU escrito a mano responden 301 a la ficha con su color", async ({
    request,
  }) => {
    const cases: [string, string][] = [
      ["/p/PT00058", "azul"],
      ["/p/759364663108", "negro"],
      ["/p/pt-00060", "rojo"],
    ];
    for (const [path, color] of cases) {
      const response = await request.get(path, { maxRedirects: 0 });
      expect(response.status(), path).toBe(301);
      const location = new URL(response.headers().location!);
      expect(location.pathname, path).toBe(ULTRA);
      expect(location.searchParams.get("color"), path).toBe(color);
      expect(location.searchParams.get("utm_source"), path).toBe("qr");
      expect(location.searchParams.get("utm_medium"), path).toBe("empaque");
      // En caché solo una hora (la URL pública la cubre la prueba del proxy).
      expect(response.headers()["cache-control"], path).toBe("public, max-age=3600");
    }
  });

  test("/p/PT00058 abre la ficha del Ultra azul @critico", async ({ page }) => {
    const errors = collectConsoleErrors(page);
    // Lleva a la URL pública del sitio: se sigue en este mismo servidor.
    const response = await page.request.get("/p/PT00058", { maxRedirects: 0 });
    const location = new URL(response.headers().location!);
    await page.goto(`${location.pathname}${location.search}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Bolik Ultra");
    await expect(page.getByText("Color: Azul · Código PT00058")).toBeVisible();
    expect(errors, "errores en la consola").toEqual([]);
  });

  test("un código que no existe muestra la 404 amigable con estado 404", async ({ page }) => {
    const response = await page.goto("/p/NO-EXISTE-123");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("link", { name: "Dónde comprar" }).first()).toBeVisible();
  });
});
