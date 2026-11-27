import type { Page } from "@playwright/test";

/**
 * Mapa de tiendas (BD-081, BD-082). Los mapas base de OpenStreetMap no se piden en las pruebas (sin
 * red externa en la CI): un PNG de 1×1. Con DATA_SOURCE=fixtures hay tiendas en 9 departamentos (9
 * pines) y 6 tiendas de ejemplo con ubicación (6 pines más): 15 pines.
 */
export const MAP_PINS = 15;

const PIXEL = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=",
  "base64",
);

/** Responde los mapas base y anota qué archivos JS traen Leaflet. */
export async function watchMap(page: Page) {
  await page.route("https://tile.openstreetmap.org/**", (route) =>
    route.fulfill({ status: 200, contentType: "image/png", body: PIXEL }),
  );
  const leaflet: string[] = [];
  page.on("response", async (response) => {
    if (response.request().resourceType() !== "script") return;
    const body = await response.text().catch(() => "");
    if (body.includes("_leaflet_id")) leaflet.push(response.url());
  });
  return leaflet;
}
