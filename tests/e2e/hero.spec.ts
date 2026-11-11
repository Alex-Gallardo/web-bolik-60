import type { Page } from "@playwright/test";
import { collectConsoleErrors, expect, expectNoA11yViolations, skipSplash, test } from "./helpers";

// Hero con capítulos (BD-050, docs/09 §5). En la CI los pósters y videos son reemplazos
// (scripts/ci/sample-media.mjs): el «video» no se puede reproducir y el hero se queda con el
// póster. En local, con `pnpm media:samples`, son los de la demo.

/** URLs de video pedidas desde ahora. */
function videoRequests(page: Page): string[] {
  const urls: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/media/video/")) urls.push(request.url());
  });
  return urls;
}

/** Espera a `load` y a que pase el tiempo ocioso en que el hero decide si pone video (≤ 2 s). */
async function settle(page: Page) {
  await page.waitForLoadState("load");
  await page.waitForTimeout(2_500);
}

test.beforeEach(async ({ page }) => {
  await skipSplash(page);
});

test.describe("hero (BD-050)", () => {
  test("póster 1 precargado, un solo h1, CTA del capítulo, sin errores y pasa axe @critico", async ({
    page,
  }) => {
    const errors = collectConsoleErrors(page);
    await page.goto("/");
    const preload = page.locator('link[rel="preload"][as="image"]');
    await expect(preload).toHaveAttribute("imagesrcset", /\/media\/hero\/planta-/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "De la materia prima a tu primer trazo.",
    );
    const poster = page.locator("section img").first();
    await expect(poster).toHaveJSProperty("complete", true);
    expect(await poster.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
    await expect(page.getByRole("tab")).toHaveCount(4);
    await expect(page.getByRole("tabpanel")).toContainText("En Villa Nueva");
    await expect(
      page.getByRole("tabpanel").getByRole("link", { name: "Ver productos" }),
    ).toHaveAttribute("href", "/productos");
    await expect(
      page.getByRole("tabpanel").getByRole("link", { name: "Nuestra historia" }),
    ).toHaveAttribute("href", "/nuestra-historia");
    await settle(page);
    await expectNoA11yViolations(page);
    expect(errors, "errores en la consola").toEqual([]);
  });

  test("las pestañas se recorren con flechas, Inicio y Fin", async ({ page }) => {
    await page.goto("/");
    const tabs = page.getByRole("tab");
    await tabs.first().focus();
    await page.keyboard.press("ArrowRight");
    await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
    await expect(tabs.nth(1)).toBeFocused();
    await expect(page.getByRole("tabpanel")).toContainText("ciclo escolar");
    await page.keyboard.press("End");
    await expect(tabs.nth(3)).toBeFocused();
    await expect(
      page.getByRole("tabpanel").getByRole("link", { name: "Cotizar por mayor" }),
    ).toHaveAttribute("href", "/cotizacion?tipo=libreria");
    await page.keyboard.press("ArrowRight");
    await expect(tabs.nth(0)).toHaveAttribute("aria-selected", "true");
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("Home");
    await expect(tabs.nth(0)).toBeFocused();
  });

  test("en móvil, sin video vertical, solo el póster: ningún video se pide", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name === "escritorio", "regla de móvil");
    const videos = videoRequests(page);
    await page.goto("/");
    await settle(page);
    expect(videos).toEqual([]);
    await expect(page.locator("section video")).toHaveCount(0);
    await expect(page.getByRole("button", { name: /video/ })).toHaveCount(0);
  });

  test("con movimiento reducido no se pide video", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "escritorio", "en móvil nunca hay video");
    await page.emulateMedia({ reducedMotion: "reduce" });
    const videos = videoRequests(page);
    await page.goto("/");
    await settle(page);
    expect(videos).toEqual([]);
  });

  test("con ahorro de datos o conexión lenta no se pide video", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "escritorio", "en móvil nunca hay video");
    for (const connection of [{ saveData: true }, { effectiveType: "3g" }]) {
      await page.addInitScript((value) => {
        Object.defineProperty(navigator, "connection", { configurable: true, get: () => value });
      }, connection);
      const videos = videoRequests(page);
      await page.goto("/");
      await settle(page);
      expect(videos, JSON.stringify(connection)).toEqual([]);
    }
  });

  test("en escritorio el video llega después de load; si no se puede reproducir queda el póster", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "escritorio", "en móvil nunca hay video");
    const errors = collectConsoleErrors(page);
    const videos = videoRequests(page);
    await page.goto("/");
    await settle(page);
    expect(videos.some((url) => url.endsWith("/media/video/planta-demo.mp4"))).toBe(true);
    // Nunca antes de load: el póster es el LCP y nada compite con él.
    const timing = await page.evaluate(() => {
      const navigation = performance.getEntriesByType(
        "navigation",
      )[0] as PerformanceNavigationTiming;
      const video = performance
        .getEntriesByType("resource")
        .find((entry) => entry.name.includes("/media/video/"));
      return { loadEnd: navigation.loadEventEnd, videoStart: video?.startTime ?? -1 };
    });
    expect(timing.videoStart).toBeGreaterThanOrEqual(timing.loadEnd);
    // Reproducible (local con media:samples): corre y se pausa fuera de pantalla. Si no (reemplazo
    // de la CI), el <video> se quita y queda el póster.
    const videoElement = page.locator("section video");
    const playing =
      (await videoElement.count()) > 0 &&
      (await videoElement.evaluate((video: HTMLVideoElement) => !video.paused));
    if (playing) {
      await expect(page.getByRole("button", { name: "Pausar video" })).toBeVisible();
      // La home todavía es corta (BD-051 a 054 traen el resto): se agrega espacio para que el
      // hero salga del todo de la pantalla.
      await page.evaluate(() => {
        document.body.style.paddingBottom = "300vh";
        window.scrollTo(0, document.body.scrollHeight);
      });
      await expect
        .poll(() => page.locator("section video").evaluate((v: HTMLVideoElement) => v.paused))
        .toBe(true);
    } else {
      await expect(page.locator("section video")).toHaveCount(0);
      await expect(page.locator("section img").first()).toBeVisible();
    }
    expect(errors, "errores en la consola").toEqual([]);
  });
});

// Sin JavaScript (CLAUDE.md: todo contenido es visible sin JS): el h1, el póster y el texto y los
// CTA de los cuatro capítulos están en el HTML; con JS solo se ve el activo.
test.describe("hero sin JavaScript (BD-050)", () => {
  test.use({ javaScriptEnabled: false });

  test("se ven el h1, el póster y los cuatro capítulos con sus CTA", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator("section img").first()).toBeVisible();
    await expect(page.getByRole("tabpanel")).toHaveCount(4);
    for (const name of ["Ver productos", "Kits escolares", "Ver bolígrafos", "Cotizar por mayor"]) {
      await expect(page.getByRole("tabpanel").getByRole("link", { name })).toBeVisible();
    }
  });
});
