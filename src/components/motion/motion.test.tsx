import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CountUp } from "./count-up";
import { OnRouteChange } from "./on-route-change";
import { PAGE_ID, PageEnter } from "./page-enter";
import { RevealObserver } from "./reveal-observer";

// ── IntersectionObserver de prueba: guarda las instancias para dispararlas a mano ──
type Callback = (entries: Partial<IntersectionObserverEntry>[]) => void;
class FakeIO {
  static instances: FakeIO[] = [];
  observed = new Set<Element>();
  constructor(public callback: Callback) {
    FakeIO.instances.push(this);
  }
  observe(el: Element) {
    this.observed.add(el);
  }
  unobserve(el: Element) {
    this.observed.delete(el);
  }
  disconnect() {
    this.observed.clear();
  }
  /** Simula que el elemento entra en pantalla. */
  enter(el: Element) {
    this.callback([{ target: el, isIntersecting: true }]);
  }
}

/** Coloca un elemento a `top` px del borde superior de la ventana (jsdom no mide). */
function placeAt(el: Element, top: number) {
  el.getBoundingClientRect = () => ({ top }) as DOMRect;
}

let pathname = "/";
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));

beforeEach(() => {
  FakeIO.instances = [];
  vi.stubGlobal("IntersectionObserver", FakeIO);
  window.matchMedia = (() => ({ matches: false })) as unknown as typeof window.matchMedia;
});

afterEach(() => {
  vi.unstubAllGlobals();
  document.documentElement.removeAttribute("data-reveal-ready");
  document.documentElement.removeAttribute("data-reduced-motion");
  document.body.innerHTML = "";
});

describe("RevealObserver (A-21, BD-044)", () => {
  function markup() {
    document.body.innerHTML = `<main><div id="arriba" data-reveal></div><div id="abajo" data-reveal></div></main>`;
    placeAt(document.getElementById("arriba")!, 100);
    placeAt(document.getElementById("abajo")!, 5000);
  }

  it("revela lo que ya está en pantalla, observa lo de abajo y luego marca «ready»", () => {
    markup();
    render(<RevealObserver />);
    // Lo ya visible, sin transición.
    expect(document.getElementById("arriba")!.getAttribute("data-revealed")).toBe("instant");
    const below = document.getElementById("abajo")!;
    expect(below.hasAttribute("data-revealed")).toBe(false);
    expect(FakeIO.instances[0]!.observed.has(below)).toBe(true);
    expect(document.documentElement.hasAttribute("data-reveal-ready")).toBe(true);
    // Al entrar en pantalla se revela y deja de observarse.
    FakeIO.instances[0]!.enter(below);
    expect(below.getAttribute("data-revealed")).toBe("");
    expect(FakeIO.instances[0]!.observed.has(below)).toBe(false);
  });

  it("toma los [data-reveal] que llegan después (otra página, grilla filtrada)", async () => {
    markup();
    render(<RevealObserver />);
    const late = document.createElement("section");
    late.innerHTML = `<p data-reveal id="tarde"></p>`;
    placeAt(late.querySelector("#tarde")!, 4000);
    document.querySelector("main")!.append(late);
    await act(async () => {}); // el MutationObserver corre como microtarea
    expect(FakeIO.instances[0]!.observed.has(document.getElementById("tarde")!)).toBe(true);
    // Lo que llega ya a la vista se muestra sin animar.
    const visible = document.createElement("p");
    visible.dataset.reveal = "";
    placeAt(visible, 50);
    document.querySelector("main")!.append(visible);
    await act(async () => {});
    expect(visible.getAttribute("data-revealed")).toBe("instant");
  });

  it("un enlace que recibe el foco dentro de un reveal oculto se ve en el acto", () => {
    markup();
    document.getElementById("abajo")!.innerHTML = `<a href="/x" id="enlace">Ir</a>`;
    render(<RevealObserver />);
    document.getElementById("enlace")!.focus();
    const below = document.getElementById("abajo")!;
    expect(below.getAttribute("data-revealed")).toBe("instant");
    expect(FakeIO.instances[0]!.observed.has(below)).toBe(false);
  });

  it("al desmontarse quita «ready»: nada queda oculto", () => {
    markup();
    const { unmount } = render(<RevealObserver />);
    unmount();
    expect(document.documentElement.hasAttribute("data-reveal-ready")).toBe(false);
  });

  it("sin IntersectionObserver no oculta nada", () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    Reflect.deleteProperty(window, "IntersectionObserver");
    markup();
    render(<RevealObserver />);
    expect(document.documentElement.hasAttribute("data-reveal-ready")).toBe(false);
  });
});

describe("CountUp (A-20, BD-044)", () => {
  let frames: FrameRequestCallback[] = [];
  beforeEach(() => {
    frames = [];
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => frames.push(cb));
    vi.stubGlobal("cancelAnimationFrame", () => {});
  });
  const flush = (now: number) => {
    const pending = frames;
    frames = [];
    act(() => pending.forEach((cb) => cb(now)));
  };
  const value = () => document.querySelector(".count-up__value")!.textContent;

  it("el HTML trae el número final (sin JS, buscador, lector de pantalla)", () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    Reflect.deleteProperty(window, "IntersectionObserver");
    render(<CountUp value={1800} suffix="+" />);
    expect(value()).toBe("1,800+");
    expect(screen.getByText("1,800+", { selector: ".sr-only" })).toBeTruthy();
    // La copia que reserva el ancho y el número animado no se leen.
    expect(document.querySelector(".count-up__ghost")!.getAttribute("aria-hidden")).toBe("true");
    expect(document.querySelector(".count-up__value")!.getAttribute("aria-hidden")).toBe("true");
  });

  it("debajo del pliegue: al entrar en pantalla cuenta de 0 al valor", () => {
    const rect = vi
      .spyOn(HTMLElement.prototype, "getBoundingClientRect")
      .mockReturnValue({ top: 5000 } as DOMRect);
    vi.spyOn(performance, "now").mockReturnValue(0);
    render(<CountUp value={60} />);
    rect.mockRestore();
    const io = FakeIO.instances[0]!;
    act(() => io.enter(document.querySelector(".count-up__value")!));
    expect(value()).toBe("0");
    flush(550);
    const middle = Number(value());
    expect(middle).toBeGreaterThan(30);
    expect(middle).toBeLessThan(60);
    flush(1100);
    expect(value()).toBe("60");
    expect(frames).toHaveLength(0);
  });

  it("ya en pantalla al montarse, o con movimiento reducido, se queda en el final", () => {
    render(<CountUp value={60} />);
    expect(FakeIO.instances).toHaveLength(0);
    document.documentElement.setAttribute("data-reduced-motion", "");
    render(<CountUp value={60} animateOnMount />);
    expect(FakeIO.instances).toHaveLength(0);
  });

  it("animateOnMount cuenta aunque ya esté en pantalla (demo de /styleguide)", () => {
    render(<CountUp value={60} animateOnMount />);
    expect(FakeIO.instances).toHaveLength(1);
  });
});

describe("OnRouteChange y PageEnter (A-02, BD-044)", () => {
  it("avisa solo cuando cambia la ruta, nunca al montarse", () => {
    pathname = "/";
    const onChange = vi.fn();
    const { rerender } = render(<OnRouteChange onChange={onChange} />);
    expect(onChange).not.toHaveBeenCalled();
    pathname = "/productos";
    rerender(<OnRouteChange onChange={onChange} />);
    expect(onChange).toHaveBeenCalledWith("/productos");
    // La misma ruta (p. ej. otro filtro en la URL) no vuelve a avisar.
    rerender(<OnRouteChange onChange={onChange} />);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("no anima la primera carga; al cambiar la ruta anima el contenedor y luego quita la clase", () => {
    pathname = "/";
    document.body.innerHTML = `<div id="${PAGE_ID}"></div>`;
    const page = document.getElementById(PAGE_ID)!;
    const { rerender } = render(<PageEnter />);
    expect(page.classList.contains("page-enter")).toBe(false);
    pathname = "/productos";
    rerender(<PageEnter />);
    expect(page.classList.contains("page-enter")).toBe(true);
    page.dispatchEvent(new Event("animationend"));
    expect(page.classList.contains("page-enter")).toBe(false);
  });
});
