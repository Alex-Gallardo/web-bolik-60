import { describe, expect, it } from "vitest";
import { publicEnv } from "@/env.public";
import { SITE, buildMetadata, canonicalPath, rootMetadata } from "./metadata";

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
      image: "/og/bolik-ultra.png",
    });
    expect(meta.alternates?.canonical).toBe("/productos/boligrafos/bolik-ultra");
    expect(meta.openGraph).toMatchObject({
      url: "/productos/boligrafos/bolik-ultra",
      locale: "es_GT",
      siteName: "Bolik",
      images: [{ url: "/og/bolik-ultra.png", width: 1200, height: 630 }],
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
    expect(meta.openGraph).not.toHaveProperty("images");
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
