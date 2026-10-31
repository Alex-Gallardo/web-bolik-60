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
