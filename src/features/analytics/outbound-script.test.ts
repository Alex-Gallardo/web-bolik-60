import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { OUTBOUND_SCRIPT } from "./outbound-script";

// El script se instala una vez por documento (como en el sitio): los enlaces cambian por prueba.
const sendBeacon = vi.fn(() => true);
const fetchMock = vi.fn(() => Promise.resolve(new Response(null, { status: 204 })));

beforeAll(() => {
  Object.defineProperty(navigator, "sendBeacon", { configurable: true, value: sendBeacon });
  vi.stubGlobal("fetch", fetchMock);
  new Function(OUTBOUND_SCRIPT)();
  // Una segunda copia (otra carga del layout) no duplica los avisos.
  new Function(OUTBOUND_SCRIPT)();
});

beforeEach(() => {
  sendBeacon.mockClear();
  sendBeacon.mockReturnValue(true);
  fetchMock.mockClear();
  window.history.replaceState(null, "", "/donde-comprar?utm_source=x#guatemala");
});

afterEach(() => {
  document.body.innerHTML = "";
});

/** Un enlace en la página; los clics no navegan (jsdom). */
function link(attrs: Record<string, string>, text = "Ir") {
  const a = document.createElement("a");
  for (const [name, value] of Object.entries(attrs)) a.setAttribute(name, value);
  a.innerHTML = `<span>${text}</span>`;
  a.addEventListener("click", (event) => event.preventDefault());
  document.body.append(a);
  return a;
}

async function sent(): Promise<Record<string, string>[]> {
  const calls = sendBeacon.mock.calls as unknown as [string, Blob][];
  return Promise.all(calls.map(async ([, blob]) => JSON.parse(await blob.text())));
}

describe("script de clics salientes (BD-083)", () => {
  it("un clic a Walmart manda el evento, la tienda y la ruta sin query", async () => {
    link({
      href: "https://www.walmart.com.gt",
      "data-event": "retailer_click",
      "data-retailer": "walmart",
      "data-sku": "PT00058",
    })
      .querySelector("span")!
      .click();
    expect(sendBeacon).toHaveBeenCalledTimes(1);
    expect((sendBeacon.mock.calls[0] as unknown as [string])[0]).toBe("/api/beacon");
    expect(await sent()).toEqual([
      { e: "retailer_click", p: "/donde-comprar", r: "walmart", k: "PT00058" },
    ]);
  });

  it("«Cómo llegar» manda la tienda y el departamento; WhatsApp, su contexto", async () => {
    link({
      href: "https://www.google.com/maps/dir/?api=1&destination=x",
      "data-event": "maps_click",
      "data-store": "tulan-quetzaltenango",
      "data-department": "quetzaltenango",
    }).click();
    link({
      href: "https://wa.me/50200000000",
      "data-event": "whatsapp_open",
      "data-context": "general",
    }).click();
    expect(await sent()).toEqual([
      { e: "maps_click", p: "/donde-comprar", s: "tulan-quetzaltenango", d: "quetzaltenango" },
      { e: "whatsapp_open", p: "/donde-comprar", c: "general" },
    ]);
  });

  it("no avisa: enlaces del sitio, sin data-event o con un evento que no es saliente", () => {
    link({ href: "/donde-comprar", "data-event": "retailer_click" }).click();
    link({ href: "https://www.walmart.com.gt" }).click();
    link({ href: "https://www.walmart.com.gt", "data-event": "quote_open" }).click();
    document.body.click();
    expect(sendBeacon).not.toHaveBeenCalled();
  });

  it("un clic en el ícono (SVG) o en el texto del enlace también cuenta", () => {
    const a = link({ href: "https://wa.me/50200000000", "data-event": "whatsapp_open" }, "Hablar");
    a.innerHTML = '<svg><path d="M0 0"/></svg>Hablar';
    a.querySelector("path")!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    a.lastChild!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(sendBeacon).toHaveBeenCalledTimes(2);
  });

  it("el clic medio cuenta; el derecho, no", () => {
    const a = link({ href: "https://www.latorre.com.gt", "data-event": "retailer_click" });
    a.dispatchEvent(new MouseEvent("auxclick", { bubbles: true, button: 1 }));
    a.dispatchEvent(new MouseEvent("auxclick", { bubbles: true, button: 2 }));
    expect(sendBeacon).toHaveBeenCalledTimes(1);
  });

  it("si sendBeacon no puede, usa fetch con keepalive", () => {
    sendBeacon.mockReturnValue(false);
    link({ href: "https://www.walmart.com.gt", "data-event": "retailer_click" }).click();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/beacon",
      expect.objectContaining({ method: "POST", keepalive: true }),
    );
  });
});
