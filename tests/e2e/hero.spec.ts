import type { Page } from "@playwright/test";
import { collectConsoleErrors, expect, expectNoA11yViolations, skipSplash, test } from "./helpers";

// Hero principal (BD-056) y video por capítulos, que desde BD-056 es la sección 3 (BD-050,
// docs/09 §5). En la CI los pósters y videos son reemplazos (scripts/ci/sample-media.mjs): el
// «video» no se puede reproducir y la sección se queda con el póster. En local, con
// `pnpm media:samples`, son los de la demo.

type Requests = { posters: string[]; videos: string[] };

/** Pósters (/media/hero/) y videos (/media/video/) pedidos desde ahora. */
function mediaRequests(page: Page): Requests {
  const requests: Requests = { posters: [], videos: [] };
  page.on("request", (request) => {
    const url = request.url();
    if (url.includes("/media/hero/")) requests.posters.push(url);
    if (url.includes("/media/video/")) requests.videos.push(url);
  });
  return requests;
}

/** Espera a `load` y a que pase el tiempo ocioso en que la sección decide si pone video (≤ 2 s). */
async function settle(page: Page) {
  await page.waitForLoadState("load");
  await page.waitForTimeout(2_500);
}

/** Lleva la sección de video a la pantalla. */
async function scrollToVideo(page: Page) {
  await page.getByRole("region", { name: "Así nace un Bolik" }).scrollIntoViewIfNeeded();
}

test.beforeEach(async ({ page }) => {
  await skipSplash(page);
});

test.describe("hero principal (BD-056)", () => {
  test("un solo h1 en el hero, sus CTA, sin imagen precargada, sin errores y pasa axe @critico", async ({
    page,
  }) => {
    const errors = collectConsoleErrors(page);
    await page.goto("/");
    const h1 = page.getByRole("heading", { level: 1 });
    await expect(h1).toHaveCount(1);
    await expect(h1).toHaveText("De la materia prima a tu primer trazo.");
    const heroRegion = page.getByRole("region", { name: "De la materia prima a tu primer trazo." });
    await expect(heroRegion).toBeInViewport();
    await expect(heroRegion.getByRole("link", { name: "Ver productos" })).toHaveAttribute(
      "href",
      "/productos",
    );
    await expect(heroRegion.getByRole("link", { name: "Cotizar por mayor" })).toHaveAttribute(
      "href",
      "/mayoreo",
    );
    // El LCP es el texto del h1: ninguna imagen se precarga.
    await expect(page.locator('link[rel="preload"][as="image"]')).toHaveCount(0);
    await settle(page);
    await expectNoA11yViolations(page);
    expect(errors, "errores en la consola").toEqual([]);
  });

  test("la ilustración del Ultra sube con fade-up y, con movimiento reducido, no se desplaza", async ({
    page,
  }) => {
    await page.goto("/");
    const art = page.locator(".hero-art");
    await expect(art).toBeVisible();
    expect(await art.evaluate((el) => getComputedStyle(el).animationName)).toBe("fade-up");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.reload();
    expect(await art.evaluate((el) => getComputedStyle(el).animationName)).toBe("fade-in");
  });
});

test.describe("video por capítulos, sección 3 (BD-050 y BD-056)", () => {
  test("en la carga inicial no se piden pósters ni video; al acercarse, sí", async ({
    page,
  }, testInfo) => {
    const errors = collectConsoleErrors(page);
    const requests = mediaRequests(page);
    await page.goto("/");
    await settle(page);
    expect(requests, "nada de la sección de video sin desplazarse").toEqual({
      posters: [],
      videos: [],
    });

    await scrollToVideo(page);
    const section = page.getByRole("region", { name: "Así nace un Bolik" });
    const poster = section.locator("img").first();
    await expect(poster).toBeVisible();
    await expect(poster).toHaveAttribute("loading", "lazy");
    await expect(poster).toHaveJSProperty("complete", true);
    expect(await poster.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
    expect(await poster.getAttribute("fetchpriority")).toBeNull();
    await expect.poll(() => requests.posters.length).toBeGreaterThan(0);
    if (testInfo.project.name === "escritorio") {
      await expect
        .poll(() => requests.videos.some((url) => url.endsWith("/media/video/planta-demo.mp4")))
        .toBe(true);
    }
    expect(errors, "errores en la consola").toEqual([]);
  });

  test("un h2, cuatro pestañas y el CTA del capítulo", async ({ page }) => {
    await page.goto("/");
    const section = page.getByRole("region", { name: "Así nace un Bolik" });
    await expect(section.getByRole("heading", { level: 2 })).toHaveText("Así nace un Bolik");
    await expect(section.getByRole("tab")).toHaveCount(4);
    await expect(section.getByRole("tabpanel")).toContainText("En Villa Nueva");
    await expect(
      section.getByRole("tabpanel").getByRole("link", { name: "Nuestra historia" }),
    ).toHaveAttribute("href", "/nuestra-historia");
  });

  test("las pestañas se recorren con flechas, Inicio y Fin", async ({ page }) => {
    await page.goto("/");
    const section = page.getByRole("region", { name: "Así nace un Bolik" });
    const tabs = section.getByRole("tab");
    await tabs.first().focus();
    await page.keyboard.press("ArrowRight");
    await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
    await expect(tabs.nth(1)).toBeFocused();
    await expect(section.getByRole("tabpanel")).toContainText("ciclo escolar");
    await page.keyboard.press("End");
    await expect(tabs.nth(3)).toBeFocused();
    await expect(
      section.getByRole("tabpanel").getByRole("link", { name: "Cotizar por mayor" }),
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
    const { videos } = mediaRequests(page);
    await page.goto("/");
    await scrollToVideo(page);
    await settle(page);
    expect(videos).toEqual([]);
    await expect(page.locator("section video")).toHaveCount(0);
    await expect(page.getByRole("button", { name: /video/ })).toHaveCount(0);
  });

  test("con movimiento reducido no se pide video", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "escritorio", "en móvil nunca hay video");
    await page.emulateMedia({ reducedMotion: "reduce" });
    const { videos } = mediaRequests(page);
    await page.goto("/");
    await scrollToVideo(page);
    await settle(page);
    expect(videos).toEqual([]);
  });

  test("con ahorro de datos o conexión lenta no se pide video", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "escritorio", "en móvil nunca hay video");
    for (const connection of [{ saveData: true }, { effectiveType: "3g" }]) {
      await page.addInitScript((value) => {
        Object.defineProperty(navigator, "connection", { configurable: true, get: () => value });
      }, connection);
      const { videos } = mediaRequests(page);
      await page.goto("/");
      await scrollToVideo(page);
      await settle(page);
      expect(videos, JSON.stringify(connection)).toEqual([]);
    }
  });

  test("en escritorio el video llega después de load; si no se puede reproducir queda el póster", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "escritorio", "en móvil nunca hay video");
    const errors = collectConsoleErrors(page);
    const { videos } = mediaRequests(page);
    let loadAt = Number.POSITIVE_INFINITY;
    let firstVideoAt = -1;
    page.once("load", () => (loadAt = Date.now()));
    page.on("request", (request) => {
      if (firstVideoAt < 0 && request.url().includes("/media/video/")) firstVideoAt = Date.now();
    });
    await page.goto("/");
    await settle(page);
    await scrollToVideo(page);
    await expect
      .poll(() => videos.some((url) => url.endsWith("/media/video/planta-demo.mp4")))
      .toBe(true);
    // Nunca antes de load: nada compite con el LCP de la página (orden de los eventos).
    expect(firstVideoAt).toBeGreaterThanOrEqual(loadAt);
    // Reproducible (local con media:samples): corre y se pausa fuera de pantalla. Si no (reemplazo
    // de la CI), el <video> se quita y queda el póster.
    const section = page.getByRole("region", { name: "Así nace un Bolik" });
    await page.waitForTimeout(1_000);
    const videoElement = section.locator("video");
    const playing =
      (await videoElement.count()) > 0 &&
      (await videoElement.evaluate((video: HTMLVideoElement) => !video.paused));
    if (playing) {
      await expect(section.getByRole("button", { name: "Pausar video" })).toBeVisible();
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await expect.poll(() => videoElement.evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
    } else {
      await expect(videoElement).toHaveCount(0);
      await expect(section.locator("img").first()).toBeVisible();
    }
    expect(errors, "errores en la consola").toEqual([]);
  });
});

// Sin JavaScript (CLAUDE.md: todo contenido es visible sin JS): el h1 del hero y el texto y los
// CTA de los cuatro capítulos están en el HTML; sin JS la sección de video queda sobre navy.
test.describe("hero y video sin JavaScript (BD-056)", () => {
  test.use({ javaScriptEnabled: false });

  test("se ven el h1, sus CTA y los cuatro capítulos con sus CTA", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator(".hero-art")).toBeVisible();
    const section = page.getByRole("region", { name: "Así nace un Bolik" });
    await expect(section.getByRole("tabpanel")).toHaveCount(4);
    await expect(section.locator("img")).toHaveCount(0);
    for (const name of ["Ver productos", "Kits escolares", "Ver bolígrafos", "Cotizar por mayor"]) {
      await expect(section.getByRole("tabpanel").getByRole("link", { name })).toBeVisible();
    }
  });
});
