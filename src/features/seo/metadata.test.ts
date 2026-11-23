import { describe, expect, it } from "vitest";
import { publicEnv } from "@/env.public";
import { DEFAULT_OG_IMAGE, SITE, buildMetadata, canonicalPath, rootMetadata } from "./metadata";

describe("metadata (BD-040, docs/10)", () => {
  it("canónica sin barra final, salvo la home", () => {
    expect(canonicalPath("/")).toBe("/");
    expect(canonicalPath("")).toBe("/");
    expect(canonicalPath("/productos/")).toBe("/productos");
    expect(canonicalPath("/productos/boligrafos//")).toBe("/productos/boligrafos");
  });

  it("buildMetadata arma canónica, Open Graph y robots", () => {
    const meta = buildMetadata({
      title: "Bolik Ultra",
      description: "Bolígrafo hexagonal de punta mediana.",
      path: "/productos/boligrafos/bolik-ultra/",
      image: { url: "/og/bolik-ultra.png", alt: "Bolik Ultra" },
    });
    expect(meta.alternates?.canonical).toBe("/productos/boligrafos/bolik-ultra");
    expect(meta.openGraph).toMatchObject({
      url: "/productos/boligrafos/bolik-ultra",
      locale: "es_GT",
      siteName: "Bolik",
      images: [{ url: "/og/bolik-ultra.png", alt: "Bolik Ultra", width: 1200, height: 630 }],
    });
    expect(meta.robots).toMatchObject({ index: true, follow: true });
  });

  it("noindex para páginas de utilidad", () => {
    const meta = buildMetadata({
      title: "Buscar",
      description: "x",
      path: "/buscar",
      noindex: true,
    });
    expect(meta.robots).toMatchObject({ index: false, follow: true });
    // También se comparten (un enlace a /cotizacion): llevan la imagen de la marca (BD-090).
    expect(meta.openGraph).toMatchObject({ images: [DEFAULT_OG_IMAGE] });
    expect(meta.twitter).toMatchObject({ images: [DEFAULT_OG_IMAGE] });
  });

  it("image: false deja la imagen al opengraph-image.tsx de la página (BD-090)", () => {
    const meta = buildMetadata({ title: "x", description: "x", path: "/x", image: false });
    expect(meta.openGraph).not.toHaveProperty("images");
    expect(meta.twitter).not.toHaveProperty("images");
  });

  it("título absoluto (la home): sin plantilla y el mismo en Open Graph", () => {
    const meta = buildMetadata({
      title: { absolute: SITE.defaultTitle },
      description: SITE.description,
      path: "/",
    });
    expect(meta.title).toEqual({ absolute: SITE.defaultTitle });
    expect(meta.openGraph).toMatchObject({ title: SITE.defaultTitle, url: "/" });
    expect(meta.alternates?.canonical).toBe("/");
  });

  it("la raíz no impone canónica ni robots (cada página pone los suyos)", () => {
    expect(rootMetadata).not.toHaveProperty("alternates");
    expect(rootMetadata).not.toHaveProperty("robots");
    expect(String(rootMetadata.metadataBase)).toBe(new URL(publicEnv.siteUrl).toString());
  });

  it("la raíz trae plantilla de título y metadataBase", () => {
    expect(rootMetadata.title).toMatchObject({ template: "%s | Bolik" });
    expect(rootMetadata.metadataBase).toBeInstanceOf(URL);
    expect(
      String(rootMetadata.title && (rootMetadata.title as { default: string }).default),
    ).not.toMatch(/Create Next App/);
  });
});
