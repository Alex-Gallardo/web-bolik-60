// @vitest-environment node
import { describe, expect, it } from "vitest";
import bolikImageLoader, { MEDIA_WIDTHS, pickWidth } from "./image-loader";

describe("pickWidth", () => {
  it("elige el ancho generado más cercano hacia arriba", () => {
    expect(pickWidth(1)).toBe(320);
    expect(pickWidth(320)).toBe(320);
    expect(pickWidth(321)).toBe(480);
    expect(pickWidth(700)).toBe(960);
    expect(pickWidth(1920)).toBe(1920);
  });

  it("nunca devuelve un ancho que no se generó", () => {
    expect(pickWidth(4000)).toBe(1920);
    for (const requested of [0, 100, 500, 999, 1500, 3000, 3840])
      expect(MEDIA_WIDTHS).toContain(pickWidth(requested));
  });
});

describe("bolikImageLoader", () => {
  it("arma la ruta del WebP procesado para medios subidos", () => {
    expect(bolikImageLoader({ src: "/media/products/bolik-ultra-azul-1-a1b2c3", width: 600 })).toBe(
      "/media/products/bolik-ultra-azul-1-a1b2c3-640.webp",
    );
  });

  it("devuelve tal cual lo que no es un medio procesado", () => {
    expect(bolikImageLoader({ src: "/brand/logo.svg", width: 300 })).toBe("/brand/logo.svg");
    expect(bolikImageLoader({ src: "/media/og/portada.jpg", width: 1200 })).toBe(
      "/media/og/portada.jpg",
    );
  });
});

describe("next/image con el loader (BD-034)", () => {
  // getImageProps arma el mismo <img> que <Image>: srcset con los anchos del loader según sizes.
  // Aquí usa los anchos por defecto de Next (en el build, next.config.ts los iguala a MEDIA_WIDTHS):
  // con cualquiera de los dos, el loader los lleva a los 6 archivos generados.
  async function imgProps(sizes: string) {
    const { getImageProps } = await import("next/image");
    return getImageProps({
      src: "/media/products/bolik-ultra-azul-a1b2c3",
      alt: "Bolik Ultra azul",
      width: 1600,
      height: 1200,
      sizes,
      loader: bolikImageLoader,
    }).props;
  }

  /** El candidato que elige el navegador: el primero cuyo ancho cubre (CSS px × DPR). */
  function chosen(srcSet: string, cssWidth: number, dpr: number) {
    const candidates = srcSet.split(", ").map((c) => {
      const [url, w] = c.split(" ");
      return { url: url!, w: Number(w!.replace("w", "")) };
    });
    return candidates.find((c) => c.w >= cssWidth * dpr)?.url ?? candidates.at(-1)!.url;
  }

  it("el srcset solo pide los 6 anchos generados, en WebP", async () => {
    const { srcSet, sizes } = await imgProps("(min-width: 768px) 50vw, 100vw");
    expect(sizes).toBe("(min-width: 768px) 50vw, 100vw");
    const generated = new Set(
      MEDIA_WIDTHS.map((w) => `/media/products/bolik-ultra-azul-a1b2c3-${w}.webp`),
    );
    // Nunca pide un archivo que no existe: cada candidato cae en uno de los 6 anchos generados.
    for (const candidate of srcSet!.split(", ")) {
      expect(generated.has(candidate.split(" ")[0]!), candidate).toBe(true);
    }
  });

  it("pide el ancho correcto según sizes: teléfono DPR 2 y escritorio", async () => {
    const { srcSet } = await imgProps("(min-width: 768px) 50vw, 100vw");
    // Teléfono de 360 px a densidad 2: la imagen ocupa 100vw = 720 px reales → 960.
    expect(chosen(srcSet!, 360, 2)).toBe("/media/products/bolik-ultra-azul-a1b2c3-960.webp");
    // Escritorio de 1280 px a densidad 1: 50vw = 640 px → 640.
    expect(chosen(srcSet!, 640, 1)).toBe("/media/products/bolik-ultra-azul-a1b2c3-640.webp");
  });
});
