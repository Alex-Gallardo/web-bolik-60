import { readFileSync } from "node:fs";
import type { APIRequestContext } from "@playwright/test";
import { expect, test } from "./helpers";

// Metadatos en todas las rutas (BD-090, docs/10 §3). Criterios: títulos y descripciones únicos en
// todo el sitio; canonical absoluto (el «con www» de producción lo exige src/env.schema.ts).
// Recorre las páginas indexables que enlaza el catálogo: la home, /productos, cada categoría y cada
// ficha. Con `request` (sin navegador): se lee el HTML tal como lo reciben Google y las redes.

/** docs/10 §1: ≤ 60 con « | Bolik». La home lleva el título de docs/10 §1 sin plantilla (68). */
const TITLE_MAX = 60;
const TITLE_EXCEPTIONS = new Set(["/"]);
/** docs/10 §1: 140–160. El tope se cumple siempre. */
const DESCRIPTION_MIN = 140;
const DESCRIPTION_MAX = 160;
/**
 * Por debajo de 140, solo los textos aprobados de doc 17 §6 que quedan cortos (/productos: 132;
 * Bolik Ultra: 137) y las fichas de los productos de ejemplo (`sample` en el seed; su plantilla
 * queda corta y nunca llegan a producción). Una página nueva corta hace fallar la prueba.
 */
const SAMPLE_PRODUCTS = new Set(
  (
    JSON.parse(readFileSync("prisma/seed/products.json", "utf8")) as {
      slug: string;
      sample?: boolean;
    }[]
  )
    .filter((product) => product.sample)
    .map((product) => product.slug),
);
const shortDescriptionAllowed = (path: string) =>
  path === "/productos" ||
  path === "/productos/boligrafos/bolik-ultra" ||
  SAMPLE_PRODUCTS.has(path.split("/")[3] ?? "");

const decode = (text: string) =>
  text
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");

/** Atributo `content`/`href` de la etiqueta que cumple `pattern` (el HTML de Next es estable). */
function attr(html: string, pattern: RegExp): string | null {
  const match = html.match(pattern);
  return match ? decode(match[1]!) : null;
}

type PageMeta = {
  path: string;
  title: string | null;
  description: string | null;
  canonical: string | null;
  robots: string | null;
  ogImage: string | null;
  ogImageAlt: string | null;
};

async function readMeta(request: APIRequestContext, path: string): Promise<PageMeta> {
  const response = await request.get(path);
  expect(response.status(), path).toBe(200);
  const html = await response.text();
  return {
    path,
    title: attr(html, /<title>([^<]*)<\/title>/),
    description: attr(html, /<meta name="description" content="([^"]*)"/),
    canonical: attr(html, /<link rel="canonical" href="([^"]*)"/),
    robots: attr(html, /<meta name="robots" content="([^"]*)"/),
    ogImage: attr(html, /<meta property="og:image" content="([^"]*)"/),
    ogImageAlt: attr(html, /<meta property="og:image:alt" content="([^"]*)"/),
  };
}

/** Las rutas indexables del catálogo: lo que enlazan /productos y cada categoría. */
async function indexablePaths(request: APIRequestContext): Promise<string[]> {
  const links = (html: string, pattern: RegExp) => [...html.matchAll(pattern)].map((m) => m[1]!);
  const catalog = await (await request.get("/productos")).text();
  const categories = [...new Set(links(catalog, /href="(\/productos\/[a-z0-9-]+)"/g))];
  const products = new Set<string>();
  for (const category of categories) {
    const html = await (await request.get(category)).text();
    for (const href of links(html, /href="(\/productos\/[a-z0-9-]+\/[a-z0-9-]+)"/g))
      products.add(href);
  }
  return ["/", "/productos", ...categories, ...products];
}

/** Ancho y alto de un PNG (cabecera IHDR). */
const pngSize = (bytes: Buffer) => ({
  width: bytes.readUInt32BE(16),
  height: bytes.readUInt32BE(20),
});

test.describe("metadatos (BD-090)", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== "escritorio", "HTML del servidor: una vez basta");
  });

  test("títulos y descripciones únicos, canonical absoluto y og:image 1200 × 630", async ({
    request,
  }) => {
    test.setTimeout(120_000);
    const paths = await indexablePaths(request);
    expect(paths.length, "categorías y fichas enlazadas").toBeGreaterThan(10);
    const pages: PageMeta[] = [];
    for (const path of paths) pages.push(await readMeta(request, path));

    for (const page of pages) {
      expect(page.title, `${page.path}: title`).toBeTruthy();
      if (!TITLE_EXCEPTIONS.has(page.path))
        expect(page.title!.length, `${page.path}: «${page.title}»`).toBeLessThanOrEqual(TITLE_MAX);
      expect(page.description, `${page.path}: description`).toBeTruthy();
      if (!shortDescriptionAllowed(page.path))
        expect(
          page.description!.length,
          `${page.path}: «${page.description}»`,
        ).toBeGreaterThanOrEqual(DESCRIPTION_MIN);
      expect(page.description!.length, `${page.path}: «${page.description}»`).toBeLessThanOrEqual(
        DESCRIPTION_MAX,
      );
      expect(page.robots, page.path).toMatch(/^index, follow/);

      // Canonical absoluto, en la ruta de la página y sin barra final (la home: solo el dominio).
      const canonical = new URL(page.canonical!);
      expect(page.canonical, page.path).toMatch(/^https?:\/\//);
      expect(canonical.pathname, page.path).toBe(page.path);
      expect(canonical.search, page.path).toBe("");
      if (page.path !== "/") expect(page.canonical!.endsWith("/"), page.path).toBe(false);

      expect(page.ogImage, `${page.path}: og:image`).toMatch(/^https?:\/\//);
      expect(page.ogImageAlt, `${page.path}: og:image:alt`).toBeTruthy();
    }

    const repeated = (values: (string | null)[]) =>
      values.filter((value, i) => values.indexOf(value) !== i);
    expect(repeated(pages.map((p) => p.title)), "títulos repetidos").toEqual([]);
    expect(repeated(pages.map((p) => p.description)), "descripciones repetidas").toEqual([]);

    // Cada imagen distinta responde un PNG de 1200 × 630. Se pide en este servidor: el dominio de
    // og:image es NEXT_PUBLIC_SITE_URL, que en la CI puede no ser el de la prueba.
    const images = [...new Set(pages.map((p) => p.ogImage!))];
    expect(images.length, "categorías y fichas tienen su imagen").toBeGreaterThan(paths.length / 2);
    // De a 6 a la vez: la primera petición de cada una la dibuja.
    for (let i = 0; i < images.length; i += 6)
      await Promise.all(
        images.slice(i, i + 6).map(async (image) => {
          const url = new URL(image);
          const response = await request.get(url.pathname + url.search);
          expect(response.status(), image).toBe(200);
          expect(response.headers()["content-type"], image).toBe("image/png");
          expect(pngSize(await response.body()), image).toEqual({ width: 1200, height: 630 });
        }),
      );
  });

  test("las páginas de utilidad siguen con noindex y su propio title", async ({ request }) => {
    const [quote, search] = await Promise.all([
      readMeta(request, "/cotizacion"),
      readMeta(request, "/buscar"),
    ]);
    for (const page of [quote, search]) {
      expect(page.robots, page.path).toMatch(/^noindex/);
      expect(page.ogImage, `${page.path}: imagen de la marca`).toMatch(/\/opengraph-image/);
    }
    expect(quote.title).not.toBe(search.title);
  });

  test("favicon de Bolik e ícono de Apple", async ({ request }) => {
    const html = await (await request.get("/")).text();
    const icon = attr(html, /<link rel="icon" href="([^"]*)"/);
    const apple = attr(html, /<link rel="apple-touch-icon" href="([^"]*)"/);
    expect(icon).toMatch(/^\/favicon\.ico/);
    expect(apple).toMatch(/^\/apple-icon\.png/);
    const appleIcon = await request.get(apple!);
    expect(appleIcon.status()).toBe(200);
    expect(pngSize(await appleIcon.body())).toEqual({ width: 180, height: 180 });
  });
});
