import type { BrowserContext, Request } from "@playwright/test";
import { expect, test } from "./helpers";

// Clics salientes (BD-083, docs/12 §4): el script del layout manda a /api/beacon los clics a una
// tienda en línea, a «Cómo llegar» y a WhatsApp. Con DATA_SOURCE=fixtures no hay base: aquí se
// revisa el aviso; la fila la prueba tests/integration/beacon.test.ts.

/** Las páginas de afuera (Walmart, Google Maps) no se piden: una página en blanco. */
async function stubExternal(context: BrowserContext) {
  await context.route(
    /^https:\/\/(www\.walmart\.com\.gt|www\.latorre\.com\.gt|www\.google\.com\/maps|wa\.me)\//,
    (route) => route.fulfill({ status: 200, contentType: "text/html", body: "<title>x</title>" }),
  );
}

/** Los avisos que salen hacia /api/beacon, con su cuerpo y su respuesta. */
function watchBeacons(page: import("@playwright/test").Page) {
  // body null: WebKit no le da a Playwright el cuerpo de un sendBeacon (el aviso sí sale).
  const sent: { body: Record<string, string> | null; status: Promise<number | undefined> }[] = [];
  page.on("request", (request: Request) => {
    if (!request.url().endsWith("/api/beacon")) return;
    sent.push({
      body: request.postData() ? JSON.parse(request.postData()!) : null,
      status: request.response().then((response) => response?.status()),
    });
  });
  return sent;
}

test.describe("clics salientes (BD-083)", () => {
  test("«Comprar en Walmart» manda el aviso y el servidor responde 204 @critico", async ({
    page,
    context,
    browserName,
  }) => {
    await stubExternal(context);
    const sent = watchBeacons(page);
    await page.goto("/donde-comprar?utm_source=prueba");
    const popup = context.waitForEvent("page");
    await page
      .getByRole("region", { name: "Compra en línea" })
      .getByRole("link", { name: /^Comprar en Walmart/ })
      .click();
    await (await popup).close();
    await expect.poll(() => sent.length).toBe(1);
    if (browserName !== "webkit")
      expect(sent[0]!.body).toEqual({ e: "retailer_click", p: "/donde-comprar", r: "walmart" });
    expect(await sent[0]!.status).toBe(204);
  });

  test("«Cómo llegar» manda la tienda y el departamento", async ({
    page,
    context,
    browserName,
  }) => {
    test.skip(browserName === "webkit", "WebKit no expone el cuerpo de un sendBeacon");
    await stubExternal(context);
    const sent = watchBeacons(page);
    await page.goto("/donde-comprar/quetzaltenango");
    const popup = context.waitForEvent("page");
    await page.getByRole("link", { name: /^Cómo llegar a Tulán/ }).click();
    await (await popup).close();
    await expect.poll(() => sent.length).toBe(1);
    expect(sent[0]!.body).toEqual({
      e: "maps_click",
      p: "/donde-comprar/quetzaltenango",
      s: "tulan-quetzaltenango",
      d: "quetzaltenango",
    });
  });

  test("un enlace del sitio no manda nada", async ({ page }) => {
    const sent = watchBeacons(page);
    await page.goto("/donde-comprar");
    await page.getByRole("link", { name: "¿Tienes una librería? Vende Bolik" }).click();
    await expect(page).toHaveURL(/\/mayoreo/);
    expect(sent).toEqual([]);
  });

  test("el endpoint rechaza un cuerpo de más de 2 KB", async ({ request }) => {
    const big = JSON.stringify({ e: "retailer_click", p: `/${"a".repeat(2_100)}` });
    const response = await request.post("/api/beacon", {
      data: big,
      headers: { "content-type": "application/json" },
    });
    expect(response.status()).toBe(413);
  });
});
