import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SPLASH_KEY, SPLASH_MS } from "@/lib/splash";
import { HEAD_SCRIPT } from "./head-script";

const root = document.documentElement;
let reduced = false;

/** Corre el script como lo hace el navegador en <head>. */
const run = () => new Function(HEAD_SCRIPT)();
const splash = () => root.getAttribute("data-splash");
/** Tiempo de respaldo hasta que el script lo quita solo (2 s + margen). */
const ON_FALLBACK = SPLASH_MS.on + SPLASH_MS.margin;
const OUT_FALLBACK = SPLASH_MS.out + SPLASH_MS.margin;

/** Simula que termina una animación en un elemento (el overlay o uno de sus hijos). */
function animationEnd(className: string) {
  const el = document.createElement("div");
  el.className = className;
  document.body.append(el);
  el.dispatchEvent(new Event("animationend", { bubbles: true }));
  el.remove();
}

beforeEach(() => {
  vi.useFakeTimers();
  reduced = false;
  window.matchMedia = ((query: string) => ({
    matches: query.includes("reduce") && reduced,
  })) as unknown as typeof window.matchMedia;
  root.setAttribute("data-splash-enabled", "true");
  history.replaceState(null, "", "/");
  sessionStorage.clear();
});

afterEach(() => {
  // Lo que quede activo se salta y se limpia: los oyentes no pasan a la siguiente prueba.
  if (splash()) {
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    vi.runAllTimers();
  }
  vi.useRealTimers();
  vi.restoreAllMocks();
  Reflect.deleteProperty(document, "prerendering");
  root.removeAttribute("data-splash");
  root.removeAttribute("data-splash-enabled");
  root.classList.remove("js");
});

describe("script de <head> (BD-025, BD-043)", () => {
  it("siempre marca <html> con la clase js", () => {
    root.setAttribute("data-splash-enabled", "false");
    run();
    expect(root.classList.contains("js")).toBe(true);
    expect(splash()).toBeNull();
  });

  it("primera visita a /: splash y se recuerda en la sesión", () => {
    run();
    expect(splash()).toBe("on");
    expect(sessionStorage.getItem(SPLASH_KEY)).toBe("1");
  });

  it("termina cuando acaba la animación del overlay, no la de sus hijos", () => {
    run();
    animationEnd("splash__word");
    expect(splash()).toBe("on");
    animationEnd("splash");
    expect(splash()).toBeNull();
  });

  it("si la animación no llega (pestaña en segundo plano), el temporizador lo quita", () => {
    run();
    vi.advanceTimersByTime(ON_FALLBACK - 1);
    expect(splash()).toBe("on");
    vi.advanceTimersByTime(1);
    expect(splash()).toBeNull();
  });

  it("segunda visita en la sesión: sin splash", () => {
    sessionStorage.setItem(SPLASH_KEY, "1");
    run();
    expect(splash()).toBeNull();
  });

  it("en otra ruta o con ancla nunca aparece (quien llega ahí busca algo)", () => {
    history.replaceState(null, "", "/productos/boligrafos");
    run();
    expect(splash()).toBeNull();
    history.replaceState(null, "", "/#catalogo");
    run();
    expect(splash()).toBeNull();
    expect(sessionStorage.getItem(SPLASH_KEY)).toBeNull();
  });

  it("con el ajuste apagado (o sin el atributo) no aparece", () => {
    root.setAttribute("data-splash-enabled", "false");
    run();
    expect(splash()).toBeNull();
    root.removeAttribute("data-splash-enabled");
    run();
    expect(splash()).toBeNull();
  });

  it.each([
    "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
    "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)",
    "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; GPTBot/1.1",
    "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; ClaudeBot/1.0)",
    "AdsBot-Google (+http://www.google.com/adsbot.html)",
    "Mozilla/5.0 (compatible; Google-InspectionTool/1.0)",
    "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
    "WhatsApp/2.23.20.0",
  ])("a bots y previsualizadores nunca: %s", (ua) => {
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue(ua);
    run();
    expect(splash()).toBeNull();
  });

  it("un teléfono cuya marca contiene «bot» (CUBOT) sí lo ve", () => {
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue(
      "Mozilla/5.0 (Linux; Android 13; CUBOT KINGKONG 9) AppleWebKit/537.36 Chrome/120 Mobile",
    );
    run();
    expect(splash()).toBe("on");
  });

  it("con movimiento reducido: «reduced» y solo 500 ms", () => {
    reduced = true;
    run();
    expect(splash()).toBe("reduced");
    vi.advanceTimersByTime(SPLASH_MS.reduced);
    expect(splash()).toBeNull();
  });

  it("una tecla lo salta: fundido corto y deja de escuchar", () => {
    run();
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab" }));
    expect(splash()).toBe("out");
    // Otro toque durante el fundido no reinicia nada.
    window.dispatchEvent(new Event("pointerdown"));
    expect(splash()).toBe("out");
    animationEnd("splash");
    expect(splash()).toBeNull();
    // Ya no escucha: una tecla después no lo vuelve a poner.
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(splash()).toBeNull();
  });

  it.each(["pointerdown", "wheel", "scroll"])("«%s» también lo salta (no bloquea nada)", (type) => {
    run();
    window.dispatchEvent(new Event(type));
    expect(splash()).toBe("out");
    vi.advanceTimersByTime(OUT_FALLBACK);
    expect(splash()).toBeNull();
  });

  it("con la página prerenderizada espera a que se active", () => {
    Object.defineProperty(document, "prerendering", { value: true, configurable: true });
    run();
    expect(splash()).toBeNull();
    expect(sessionStorage.getItem(SPLASH_KEY)).toBeNull();
    document.dispatchEvent(new Event("prerenderingchange"));
    expect(splash()).toBe("on");
  });

  it("si sessionStorage está bloqueado, no hay splash y la página sigue", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("bloqueado", "SecurityError");
    });
    expect(run).not.toThrow();
    expect(root.classList.contains("js")).toBe(true);
    expect(splash()).toBeNull();
  });
});
