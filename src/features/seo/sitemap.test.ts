import { describe, expect, it } from "vitest";
import type { SitemapEntriesView } from "@/server/data/types";
import { STATIC_PAGES, buildSitemap } from "./sitemap";

const SITE_URL = "https://www.bolik66.com";

const entries = (overrides: Partial<SitemapEntriesView> = {}): SitemapEntriesView => ({
  categories: [
    { slug: "boligrafos", updatedAt: "2026-11-10T10:00:00.000Z" },
    { slug: "marcadores", updatedAt: "2026-11-01T10:00:00.000Z" },
  ],
  products: [
    {
      slug: "bolik-ultra",
      categorySlug: "boligrafos",
      updatedAt: "2026-11-15T08:30:00.000Z",
      images: [],
    },
    { slug: "marcador-pizarra", categorySlug: "marcadores", updatedAt: null, images: [] },
  ],
  departments: [{ slug: "guatemala", updatedAt: "2026-11-18T00:00:00.000Z" }],
  contentUpdatedAt: "2026-11-12T00:00:00.000Z",
  ...overrides,
});

const urls = (sitemap: ReturnType<typeof buildSitemap>) => sitemap.map((e) => e.url);

describe("sitemap.xml (BD-092, docs/10 §5)", () => {
  it("lista la home, /productos, /donde-comprar, las categorías y las fichas con URL absoluta", () => {
    expect(urls(buildSitemap(entries(), SITE_URL))).toEqual([
      "https://www.bolik66.com/",
      "https://www.bolik66.com/productos",
      "https://www.bolik66.com/donde-comprar",
      "https://www.bolik66.com/productos/boligrafos",
      "https://www.bolik66.com/productos/marcadores",
      "https://www.bolik66.com/productos/boligrafos/bolik-ultra",
      "https://www.bolik66.com/productos/marcadores/marcador-pizarra",
    ]);
  });

  it("sin utilidades, sin admin, sin barra final y sin páginas de departamento (llegan con BD-082)", () => {
    const list = urls(buildSitemap(entries(), SITE_URL));
    for (const url of list) {
      const { pathname } = new URL(url);
      expect(pathname).not.toMatch(/^\/(buscar|cotizacion|styleguide|admin|api|donde-comprar\/)/);
      if (pathname !== "/") expect(url.endsWith("/")).toBe(false);
    }
    expect(STATIC_PAGES.map((p) => p.path)).toEqual(["/", "/productos", "/donde-comprar"]);
  });

  it("/donde-comprar toma la fecha del departamento con la tienda más reciente (BD-080)", () => {
    const sitemap = buildSitemap(
      entries({
        departments: [
          { slug: "guatemala", updatedAt: "2026-11-18T00:00:00.000Z" },
          { slug: "quetzaltenango", updatedAt: "2026-11-20T00:00:00.000Z" },
          { slug: "solola", updatedAt: null },
        ],
      }),
      SITE_URL,
    );
    const stores = sitemap.find((e) => e.url.endsWith("/donde-comprar"))!;
    expect(stores.lastModified).toBe("2026-11-20T00:00:00.000Z");
  });

  it("lastModified es la fecha real: la home toma la más reciente entre contenido y catálogo", () => {
    const byUrl = new Map(buildSitemap(entries(), SITE_URL).map((e) => [e.url, e.lastModified]));
    // Catálogo: el producto del 15 nov es lo más reciente; contenido: 12 nov.
    expect(byUrl.get("https://www.bolik66.com/")).toBe("2026-11-15T08:30:00.000Z");
    expect(byUrl.get("https://www.bolik66.com/productos")).toBe("2026-11-15T08:30:00.000Z");
    expect(byUrl.get("https://www.bolik66.com/productos/marcadores")).toBe(
      "2026-11-01T10:00:00.000Z",
    );
  });

  it("la home cambia con el contenido aunque el catálogo sea más viejo", () => {
    const sitemap = buildSitemap(
      entries({ contentUpdatedAt: "2026-11-19T00:00:00.000Z" }),
      SITE_URL,
    );
    expect(sitemap[0]!.lastModified).toBe("2026-11-19T00:00:00.000Z");
    expect(sitemap[1]!.lastModified).toBe("2026-11-15T08:30:00.000Z");
  });

  it("sin fecha no inventa una: omite lastModified (fuente de ejemplo)", () => {
    const sitemap = buildSitemap(
      entries({
        categories: [{ slug: "boligrafos", updatedAt: null }],
        products: [
          { slug: "bolik-ultra", categorySlug: "boligrafos", updatedAt: null, images: [] },
        ],
        departments: [{ slug: "guatemala", updatedAt: null }],
        contentUpdatedAt: null,
      }),
      SITE_URL,
    );
    for (const entry of sitemap) expect(entry).not.toHaveProperty("lastModified");
  });

  it("usa el dominio que recibe (staging o local)", () => {
    expect(urls(buildSitemap(entries(), "http://localhost:3100"))[1]).toBe(
      "http://localhost:3100/productos",
    );
  });
});

describe("imágenes de producto en el sitemap (BD-097, docs/10 §8)", () => {
  const withPhotos = entries({
    products: [
      {
        slug: "bolik-ultra",
        categorySlug: "boligrafos",
        updatedAt: null,
        images: [
          "/media/products/bolik-ultra-azul-principal-c9384adc",
          "/media/products/bolik-ultra-azul-punta-fb7192e5",
          "/media/products/bolik-ultra-azul-principal-c9384adc",
        ],
      },
      { slug: "marcador-pizarra", categorySlug: "marcadores", updatedAt: null, images: [] },
    ],
  });

  it("cada ficha lleva sus fotos como URL absoluta del WebP más grande, sin repetir", () => {
    const ultra = buildSitemap(withPhotos, SITE_URL).find((e) => e.url.endsWith("/bolik-ultra"))!;
    expect(ultra.images).toEqual([
      "https://www.bolik66.com/media/products/bolik-ultra-azul-principal-c9384adc-1920.webp",
      "https://www.bolik66.com/media/products/bolik-ultra-azul-punta-fb7192e5-1920.webp",
    ]);
  });

  it("sin fotos no publica `images`; las páginas fijas y las categorías no llevan", () => {
    const sitemap = buildSitemap(withPhotos, SITE_URL);
    const withImages = sitemap.filter((e) => "images" in e).map((e) => e.url);
    expect(withImages).toEqual(["https://www.bolik66.com/productos/boligrafos/bolik-ultra"]);
  });
});
