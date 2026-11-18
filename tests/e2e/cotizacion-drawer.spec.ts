import type { Page } from "@playwright/test";
import { collectConsoleErrors, expect, expectNoA11yViolations, test } from "./helpers";

// Drawer de la cotización (BD-071). Criterios: abrirlo no carga más de 30 KB y «Deshacer»
// restaura la línea.

const ULTRA = "/productos/boligrafos/bolik-ultra";
const MAX_OPEN_BYTES = 30 * 1024;

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

/** Deja una cotización guardada antes de cargar la página (como si se hubiera armado antes). */
async function seedQuote(page: Page) {
  const value = JSON.stringify({
    state: {
      lines: [line("PT00058", "Azul", 3), line("PT00059", "Negro", 5), line("PT00060", "Rojo", 7)],
    },
    version: 1,
  });
  await page.addInitScript((stored) => {
    // Solo la primera carga: al recargar debe verse lo que guardó la página.
    if (!window.sessionStorage.getItem("seeded")) {
      window.localStorage.setItem("bolik_quote", stored);
      window.sessionStorage.setItem("seeded", "1");
    }
  }, value);
}

/**
 * Bytes transferidos (cuerpo comprimido, como los cuenta Lighthouse) de los scripts que se
 * descargan desde ahora, con el detalle por archivo para el reporte.
 */
function measureScripts(page: Page) {
  const sizes: Promise<[string, number]>[] = [];
  page.on("requestfinished", (request) => {
    if (request.resourceType() === "script")
      sizes.push(
        request.sizes().then((s) => [new URL(request.url()).pathname, s.responseBodySize]),
      );
  });
  return async () => {
    const files = await Promise.all(sizes);
    return { total: files.reduce((sum, [, size]) => sum + size, 0), files };
  };
}

/**
 * Corre `action` y espera a que no quede ningún script descargándose durante medio segundo.
 * waitForLoadState("networkidle") no sirve aquí: si la página ya llegó a ese estado, vuelve al
 * instante aunque haya descargas nuevas en curso.
 */
async function scriptsSettled(page: Page, action: () => Promise<unknown>) {
  let pending = 0;
  let last = Date.now();
  const start = (request: { resourceType(): string }) => {
    if (request.resourceType() !== "script") return;
    pending++;
    last = Date.now();
  };
  const end = (request: { resourceType(): string }) => {
    if (request.resourceType() !== "script") return;
    pending--;
    last = Date.now();
  };
  page.on("request", start);
  page.on("requestfinished", end);
  page.on("requestfailed", end);
  await action();
  await expect.poll(() => pending === 0 && Date.now() - last > 500, { timeout: 10_000 }).toBe(true);
  page.off("request", start);
  page.off("requestfinished", end);
  page.off("requestfailed", end);
}

const drawer = (page: Page) => page.getByRole("dialog", { name: "Mi cotización" });

test.describe("drawer de la cotización (BD-071)", () => {
  test("abrirlo no carga más de 30 KB", async ({ page, browserName }) => {
    // Los bytes no dependen del navegador; WebKit no avisa el fin de todas las descargas.
    test.skip(browserName !== "chromium", "se mide en Chromium");
    await seedQuote(page);
    // La home no carga zustand ni Radix: es el caso con más por descargar.
    await scriptsSettled(page, () => page.goto("/"));
    await expect(page.getByRole("link", { name: "Mi cotización, 3 productos" })).toBeVisible();

    // Se abre con su evento y no con un clic: la primera interacción en cualquier página precarga
    // el toaster y el diálogo de feedback (FeedbackHost, BD-024), que ya traen Radix Dialog y
    // esconderían parte de lo que cuesta el drawer. Así se mide todo lo que el drawer descarga.
    const bytes = measureScripts(page);
    await scriptsSettled(page, () =>
      page.evaluate(() => window.dispatchEvent(new Event("bolik:quote-open"))),
    );
    await expect(drawer(page)).toBeVisible();
    const { total, files } = await bytes();
    const detail = JSON.stringify(files);
    test.info().annotations.push({ type: "bytes al abrir", description: `${total} ${detail}` });
    expect(total, `JS descargado al abrir el drawer: ${detail}`).toBeLessThanOrEqual(
      MAX_OPEN_BYTES,
    );
    expect(total, "el drawer se descarga al abrirlo").toBeGreaterThan(0);
  });

  test("abrirlo desde el header; Escape lo cierra y devuelve el foco; pasa axe @critico", async ({
    page,
  }) => {
    const errors = collectConsoleErrors(page);
    await seedQuote(page);
    await page.goto("/");
    const link = page.getByRole("link", { name: "Mi cotización, 3 productos" });
    await link.click();
    await expect(drawer(page)).toBeVisible();
    await expect(drawer(page).getByText("3 productos")).toBeVisible();
    await expect(drawer(page).getByRole("listitem")).toHaveCount(3);
    await expectNoA11yViolations(page);

    await page.keyboard.press("Escape");
    await expect(drawer(page)).toBeHidden();
    await expect(link).toBeFocused();
    expect(errors, "errores en la consola").toEqual([]);
  });

  test("cambiar la cantidad, quitar y deshacer: la línea vuelve a su lugar y se conserva al recargar", async ({
    page,
  }) => {
    await seedQuote(page);
    await page.goto(ULTRA);
    await page.getByRole("link", { name: "Mi cotización, 3 productos" }).click();
    const panel = drawer(page);
    await expect(panel).toBeVisible();

    const negro = panel.locator('[data-quote-line="variante:PT00059:cajilla12"]');
    await negro.getByRole("button", { name: "Agregar uno" }).click();
    await expect(negro.getByRole("spinbutton")).toHaveValue("6");

    await panel.getByRole("button", { name: "Quitar Bolik Ultra Negro · PT00059" }).click();
    await expect(panel.getByRole("listitem")).toHaveCount(2);
    await expect(panel.getByRole("status")).toContainText("Quitamos Bolik Ultra");
    // Con el drawer abierto el header queda oculto al lector (modal): se mira el atributo.
    await expect(page.locator("[data-quote-link]")).toHaveAttribute(
      "aria-label",
      "Mi cotización, 2 productos",
    );
    // El foco queda en el «Quitar» que ocupó su lugar.
    await expect(
      panel.getByRole("button", { name: "Quitar Bolik Ultra Rojo · PT00060" }),
    ).toBeFocused();

    await panel.getByRole("button", { name: "Deshacer" }).click();
    await expect(panel.getByRole("listitem")).toHaveCount(3);
    await expect(panel.getByRole("listitem").nth(1)).toContainText("Negro · PT00059");
    await expect(negro.getByRole("spinbutton")).toHaveValue("6");

    await page.reload();
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("bolik_quote")!));
    expect(
      stored.state.lines.map((l: { ref: string; quantity: number }) => [l.ref, l.quantity]),
    ).toEqual([
      ["PT00058", 3],
      ["PT00059", 6],
      ["PT00060", 7],
    ]);
  });

  test("«Ver cotización» del toast de la ficha abre el drawer", async ({ page }) => {
    await page.goto(ULTRA);
    await page.getByRole("button", { name: "Agregar a mi cotización" }).click();
    await page.getByRole("button", { name: "Ver cotización" }).first().click();
    await expect(drawer(page)).toBeVisible();
    await expect(drawer(page).getByText("1 producto", { exact: true })).toBeVisible();
    await expect(page).toHaveURL(ULTRA);
  });

  test("sin productos, el drawer muestra el estado vacío", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Mi cotización", exact: true }).click();
    await expect(drawer(page).getByText("Tu cotización está vacía")).toBeVisible();
    await expect(drawer(page).getByRole("link", { name: "Ver el catálogo" })).toBeVisible();
  });

  test.describe("móvil", () => {
    test.use({ viewport: { width: 360, height: 740 } });

    // La barra móvil sigue con «Cotizar» (BD-042): «Mi cotización (n)» no cupo en el presupuesto
    // de JS (paso 3 del ticket, docs/14). El drawer se abre desde el header y sale desde abajo.
    test("a 360 px el drawer sale desde abajo, ocupa el ancho y no desborda", async ({ page }) => {
      await seedQuote(page);
      await page.goto("/");
      await page.getByRole("link", { name: "Mi cotización, 3 productos" }).click();
      const panel = drawer(page);
      await expect(panel).toBeVisible();
      // Entra deslizándose desde abajo (A-08, 420 ms): se mide cuando ya llegó.
      await expect
        .poll(async () => {
          const box = (await panel.boundingBox())!;
          return [box.x, box.width, Math.round(box.y + box.height)];
        })
        .toEqual([0, 360, 740]);
      const overflow = await panel.evaluate((el) => {
        const body = el.querySelector(".overflow-y-auto")!;
        return body.scrollWidth - body.clientWidth;
      });
      expect(overflow, "sin scroll horizontal en el drawer").toBe(0);
    });
  });
});
