import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { HeroChapterView } from "@/server/data/types";
import { HeroPlayer, type PosterProps } from "./hero-player";
import { canPlayVideo, HERO_MOBILE_QUERY, pickVideo } from "./video-policy";
import { VideoHero } from "./video-hero";

const poster = (key: string) => ({
  src: `/media/hero/${key}-a1b2c3d4`,
  alt: key,
  width: 1280,
  height: 720,
  blurDataUrl: null,
});

const chapters: HeroChapterView[] = [
  {
    key: "planta",
    label: "Planta",
    hint: "Así nace un Bolik",
    eyebrow: "Planta · Así nace un Bolik",
    line: "En Villa Nueva fabricamos.",
    cta: { kind: "link", label: "Ver productos", href: "/productos" },
    secondaryCta: { label: "Nuestra historia", href: "/nuestra-historia" },
    videoDesktop: "/media/video/planta-demo.mp4",
    videoMobile: null,
    poster: poster("planta"),
  },
  {
    key: "aula",
    label: "Aula",
    hint: "Primeros trazos",
    eyebrow: "Aula · Primeros trazos",
    line: "Útiles que aguantan.",
    cta: { kind: "link", label: "Kits escolares", href: "/kits-escolares" },
    secondaryCta: null,
    videoDesktop: "/media/video/aula-demo.mp4",
    videoMobile: "/media/video/aula-vertical.mp4",
    poster: poster("aula"),
  },
  {
    key: "libreria",
    label: "Librería",
    hint: "Para tu mostrador",
    eyebrow: "Librería · Para tu mostrador",
    line: "Compra directo de fábrica.",
    cta: { kind: "quote", label: "Cotizar por mayor", quoteType: "libreria" },
    secondaryCta: { label: "Ser distribuidor", href: "/mayoreo#distribuidor" },
    videoDesktop: null,
    videoMobile: null,
    poster: null,
  },
];

// ── Navegador de prueba: ancho, movimiento reducido, conexión, IntersectionObserver y video ──
let media: { mobile: boolean; reduced: boolean };
let connection: { saveData?: boolean; effectiveType?: string } | undefined;
class FakeIO {
  static last: FakeIO | undefined;
  static all: FakeIO[] = [];
  constructor(
    public callback: (entries: Partial<IntersectionObserverEntry>[]) => void,
    public options?: IntersectionObserverInit,
  ) {
    FakeIO.last = this;
    FakeIO.all.push(this);
  }
  observing = false;
  observe() {
    this.observing = true;
  }
  disconnect() {}
}
/** La sección entra en pantalla (el observador de cercanía, con rootMargin, BD-056). */
const approach = () =>
  act(() =>
    FakeIO.all
      .filter((o) => o.options?.rootMargin)
      .forEach((o) => o.callback([{ isIntersecting: true }])),
  );
const play = vi.fn(() => Promise.resolve());
const pause = vi.fn();

beforeEach(() => {
  media = { mobile: false, reduced: false };
  connection = undefined;
  FakeIO.last = undefined;
  FakeIO.all = [];
  play.mockClear();
  pause.mockClear();
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query === HERO_MOBILE_QUERY ? media.mobile : media.reduced,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
  Object.defineProperty(navigator, "connection", { configurable: true, get: () => connection });
  vi.stubGlobal("IntersectionObserver", FakeIO);
  // Tiempo ocioso inmediato: el video se habilita en cuanto se monta (jsdom ya está en «complete»).
  vi.stubGlobal("requestIdleCallback", (cb: () => void) => {
    cb();
    return 1;
  });
  vi.stubGlobal("cancelIdleCallback", () => {});
  vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(play);
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(pause);
});

afterEach(() => {
  // Desmonta antes de quitar los globales: la limpieza del efecto usa cancelIdleCallback.
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/** Como los calcula VideoHero con getImageProps: desde BD-056, todos diferidos y sin prioridad. */
const posters: (PosterProps | null)[] = chapters.map((c) =>
  c.poster
    ? {
        src: `${c.poster.src}-1920.webp`,
        srcSet: `${c.poster.src}-640.webp 640w`,
        sizes: "100vw",
        loading: "lazy",
      }
    : null,
);

/** Monta el reproductor y, salvo { near: false }, acerca la sección a la pantalla. */
const renderPlayer = ({ near = true } = {}) => {
  const result = render(
    <HeroPlayer chapters={chapters} posters={posters}>
      <h2>Título</h2>
    </HeroPlayer>,
  );
  if (near) approach();
  return result;
};
const tabs = () => screen.getAllByRole("tab");
const selected = () => tabs().findIndex((t) => t.getAttribute("aria-selected") === "true");
const video = () => document.querySelector("video");
const activePanel = () => document.querySelector<HTMLElement>("[role=tabpanel][data-active]")!;

describe("video-policy (BD-050)", () => {
  it("sin video con movimiento reducido, ahorro de datos o conexión lenta", () => {
    expect(canPlayVideo({ reducedMotion: false })).toBe(true);
    expect(canPlayVideo({ reducedMotion: false, effectiveType: "4g" })).toBe(true);
    expect(canPlayVideo({ reducedMotion: true })).toBe(false);
    expect(canPlayVideo({ reducedMotion: false, saveData: true })).toBe(false);
    for (const effectiveType of ["slow-2g", "2g", "3g"])
      expect(canPlayVideo({ reducedMotion: false, effectiveType })).toBe(false);
  });

  it("en móvil solo el vertical; en escritorio el 16:9", () => {
    expect(pickVideo(chapters[0]!, false)).toBe("/media/video/planta-demo.mp4");
    expect(pickVideo(chapters[0]!, true)).toBeNull();
    expect(pickVideo(chapters[1]!, true)).toBe("/media/video/aula-vertical.mp4");
  });
});

describe("HeroPlayer (BD-050)", () => {
  it("lejos de la pantalla (carga inicial): texto y CTA, sin póster ni video (BD-056)", () => {
    renderPlayer({ near: false });
    expect(document.querySelector("img")).toBeNull();
    expect(video()).toBeNull();
    expect(activePanel().textContent).toContain("En Villa Nueva fabricamos.");
    // Un observador espera a que la sección entre en pantalla.
    expect(FakeIO.all.some((o) => o.options?.rootMargin)).toBe(true);
  });

  it("con la página cargando, no mira la sección hasta `load` (BD-056)", () => {
    const readyState = vi.spyOn(document, "readyState", "get").mockReturnValue("loading");
    renderPlayer({ near: false });
    const observer = FakeIO.all.find((o) => o.options?.rootMargin)!;
    expect(observer.observing).toBe(false);
    readyState.mockReturnValue("complete");
    act(() => {
      window.dispatchEvent(new Event("load"));
    });
    expect(observer.observing).toBe(true);
  });

  it("al acercarse, el capítulo 1 sale con su póster diferido, su texto y sus CTA", () => {
    media.reduced = true; // sin video
    renderPlayer();
    const images = document.querySelectorAll("img");
    expect(images).toHaveLength(1);
    expect(images[0]!.getAttribute("src")).toBe("/media/hero/planta-a1b2c3d4-1920.webp");
    expect(images[0]!.getAttribute("fetchpriority")).toBeNull();
    expect(images[0]!.getAttribute("loading")).toBe("lazy");
    expect(images[0]!.getAttribute("alt")).toBe("");
    expect(activePanel().textContent).toContain("En Villa Nueva fabricamos.");
    expect(screen.getByRole("link", { name: "Ver productos" }).getAttribute("href")).toBe(
      "/productos",
    );
    expect(screen.getByRole("link", { name: "Nuestra historia" }).getAttribute("href")).toBe(
      "/nuestra-historia",
    );
    expect(video()).toBeNull();
    expect(screen.queryByRole("button", { name: "Pausar video" })).toBeNull();
  });

  it("pestañas con flechas, Inicio y Fin; el panel dice qué pestaña lo controla", () => {
    media.reduced = true;
    renderPlayer();
    tabs()[0]!.focus();
    fireEvent.keyDown(tabs()[0]!, { key: "ArrowRight" });
    expect(selected()).toBe(1);
    expect(document.activeElement).toBe(tabs()[1]);
    expect(tabs()[1]!.getAttribute("tabindex")).toBe("0");
    expect(tabs()[0]!.getAttribute("tabindex")).toBe("-1");
    expect(activePanel().getAttribute("aria-labelledby")).toBe(tabs()[1]!.id);
    fireEvent.keyDown(tabs()[1]!, { key: "End" });
    expect(selected()).toBe(2);
    fireEvent.keyDown(tabs()[2]!, { key: "ArrowRight" });
    expect(selected()).toBe(0);
    fireEvent.keyDown(tabs()[0]!, { key: "ArrowLeft" });
    expect(selected()).toBe(2);
    fireEvent.keyDown(tabs()[2]!, { key: "Home" });
    expect(selected()).toBe(0);
    // Otras teclas no hacen nada.
    fireEvent.keyDown(tabs()[0]!, { key: "Enter" });
    expect(selected()).toBe(0);
  });

  it("los paneles de todos los capítulos están en el HTML (sin JS se ven todos)", () => {
    media.reduced = true;
    renderPlayer();
    const panels = [...document.querySelectorAll("[role=tabpanel]")];
    expect(panels).toHaveLength(chapters.length);
    tabs().forEach((tab, index) => {
      expect(tab.getAttribute("aria-controls")).toBe(panels[index]!.id);
      expect(panels[index]!.getAttribute("aria-labelledby")).toBe(tab.id);
    });
    expect(panels.filter((p) => p.hasAttribute("data-active"))).toHaveLength(1);
    // Los CTA de los demás capítulos también están: buscadores e IA los leen sin JS.
    expect(screen.getByRole("link", { name: "Kits escolares" }).getAttribute("href")).toBe(
      "/kits-escolares",
    );
  });

  it("con el foco dentro del hero, el video no avanza solo (el foco no se pierde)", () => {
    renderPlayer();
    const cta = screen.getByRole("link", { name: "Ver productos" });
    fireEvent.focus(cta);
    fireEvent.ended(video()!);
    expect(selected()).toBe(0);
    // Al salir el foco, vuelve a avanzar.
    fireEvent.blur(cta, { relatedTarget: document.body });
    fireEvent.ended(video()!);
    expect(selected()).toBe(1);
  });

  it("las flechas parten de la pestaña que tiene el foco", () => {
    media.reduced = true;
    renderPlayer();
    fireEvent.click(tabs()[2]!);
    // El foco quedó en la pestaña 1 (p. ej., el video avanzó): la flecha va a la 2, no a la 4.
    tabs()[0]!.focus();
    fireEvent.keyDown(tabs()[0]!, { key: "ArrowRight" });
    expect(selected()).toBe(1);
  });

  it("el CTA de cotización lleva a /cotizacion con el tipo hasta que llegue el drawer", () => {
    media.reduced = true;
    renderPlayer();
    fireEvent.click(tabs()[2]!);
    expect(screen.getByRole("link", { name: "Cotizar por mayor" }).getAttribute("href")).toBe(
      "/cotizacion?tipo=libreria",
    );
    // El texto nuevo entra animado (A-12); el primero no.
    expect(activePanel().hasAttribute("data-enter")).toBe(true);
  });

  it("al visitar un capítulo monta su póster; sin póster no hay imagen", () => {
    media.reduced = true;
    renderPlayer();
    fireEvent.click(tabs()[1]!);
    expect([...document.querySelectorAll("img")].map((i) => i.getAttribute("alt"))).toEqual([
      "",
      "",
    ]);
    expect(document.querySelectorAll("img")).toHaveLength(2);
  });

  it("en escritorio, después de load: video del capítulo, pausa y siguiente al terminar", async () => {
    renderPlayer();
    expect(video()?.getAttribute("src")).toBe("/media/video/planta-demo.mp4");
    expect(play).toHaveBeenCalled();
    // Mientras corre, el póster del siguiente capítulo ya está montado.
    expect(document.querySelectorAll("img")).toHaveLength(2);

    fireEvent.click(screen.getByRole("button", { name: "Pausar video" }));
    expect(pause).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Reproducir video" })).toBeTruthy();
    // En pausa, al terminar no avanza.
    fireEvent.ended(video()!);
    expect(selected()).toBe(0);

    fireEvent.click(screen.getByRole("button", { name: "Reproducir video" }));
    fireEvent.ended(video()!);
    expect(selected()).toBe(1);
    expect(video()?.getAttribute("src")).toBe("/media/video/aula-demo.mp4");
  });

  it("la barra avanza con scaleX según el video", () => {
    renderPlayer();
    const element = video()!;
    Object.defineProperty(element, "duration", { value: 10 });
    Object.defineProperty(element, "currentTime", { value: 5 });
    fireEvent.timeUpdate(element);
    expect(tabs()[0]!.querySelector<HTMLElement>(".hero-bar")!.style.transform).toBe("scaleX(0.5)");
    fireEvent.click(tabs()[1]!);
    expect(tabs()[0]!.querySelector<HTMLElement>(".hero-bar")!.style.transform).toBe("");
  });

  it("fuera de pantalla se pausa y al volver sigue", () => {
    renderPlayer();
    play.mockClear();
    act(() => FakeIO.last!.callback([{ isIntersecting: false }]));
    expect(pause).toHaveBeenCalled();
    act(() => FakeIO.last!.callback([{ isIntersecting: true }]));
    expect(play).toHaveBeenCalled();
  });

  it("un video que falla deja el póster", () => {
    renderPlayer();
    fireEvent.error(video()!);
    expect(video()).toBeNull();
    expect(document.querySelector("img")).not.toBeNull();
  });

  it("si el navegador bloquea la reproducción automática, queda en pausa", async () => {
    play.mockImplementation(() =>
      Promise.reject(Object.assign(new Error("bloqueado"), { name: "NotAllowedError" })),
    );
    renderPlayer();
    expect(await screen.findByRole("button", { name: "Reproducir video" })).toBeTruthy();
  });

  it("sin video con ahorro de datos, conexión lenta o en móvil sin vertical", () => {
    connection = { saveData: true };
    const { unmount } = renderPlayer();
    expect(video()).toBeNull();
    unmount();

    connection = { effectiveType: "3g" };
    renderPlayer().unmount();
    expect(video()).toBeNull();

    connection = undefined;
    media.mobile = true;
    renderPlayer();
    expect(video()).toBeNull();
    // El capítulo 2 sí trae vertical.
    fireEvent.click(tabs()[1]!);
    expect(video()?.getAttribute("src")).toBe("/media/video/aula-vertical.mp4");
  });
});

describe("VideoHero (BD-050, sección 3 desde BD-056)", () => {
  it("un h2 «Así nace un Bolik» (sin h1) y pósters diferidos; sin capítulos, nada", () => {
    media.reduced = true;
    const { unmount } = render(<VideoHero chapters={chapters} />);
    expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
    const region = screen.getByRole("region", { name: "Así nace un Bolik" });
    expect(region.querySelector("h2")!.textContent).toBe("Así nace un Bolik");
    // En el HTML del servidor no hay póster: llega al acercarse la sección.
    expect(document.querySelector("img")).toBeNull();
    approach();
    // Atributos de next/image (srcset y sizes), diferido y sin prioridad alta.
    const img = document.querySelector("img")!;
    expect(img.getAttribute("srcset")).toContain("planta-a1b2c3d4");
    expect(img.getAttribute("sizes")).toBe("100vw");
    expect(img.getAttribute("loading")).toBe("lazy");
    expect(img.getAttribute("fetchpriority")).toBeNull();
    unmount();

    const { container } = render(<VideoHero chapters={[]} />);
    expect(container.innerHTML).toBe("");
  });
});
