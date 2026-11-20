import { readFileSync } from "node:fs";
import type { APIRequestContext } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { expect, skipSplash, test } from "./helpers";

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

/** El XML de /sitemap.xml. */
async function sitemapXml(request: APIRequestContext): Promise<string> {
  const response = await request.get("/sitemap.xml");
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toMatch(/xml/);
  return response.text();
}

/** Ruta de cada `<tag>`, sin el dominio (NEXT_PUBLIC_SITE_URL puede no ser el de la prueba). */
function xmlPaths(xml: string, tag: "loc" | "image:loc"): string[] {
  const pattern = new RegExp(`<${tag}>([^<]*)</${tag}>`, "g");
  const urls = [...xml.matchAll(pattern)].map((m) => decode(m[1]!));
  for (const url of urls) expect(url, url).toMatch(/^https?:\/\//);
  return urls.map((url) => new URL(url).pathname);
}

/** Las rutas de cada página del sitemap. */
async function sitemapPaths(request: APIRequestContext): Promise<string[]> {
  return xmlPaths(await sitemapXml(request), "loc");
}

test.describe("sitemap.xml y robots.txt (BD-092)", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== "escritorio", "HTML del servidor: una vez basta");
  });

  test("solo páginas publicadas e indexables: cada URL responde 200, index y canónica propia", async ({
    request,
  }) => {
    test.setTimeout(120_000);
    const paths = await sitemapPaths(request);
    expect(paths.length, "home, catálogo, categorías y fichas").toBeGreaterThan(10);
    expect(new Set(paths).size, "sin URLs repetidas").toBe(paths.length);
    for (const path of paths) {
      expect(path, "sin utilidades ni admin").not.toMatch(
        /^\/(buscar|cotizacion|styleguide|admin|api)(\/|$)/,
      );
      if (path !== "/") expect(path.endsWith("/"), path).toBe(false);
    }
    // readMeta ya exige 200.
    for (let i = 0; i < paths.length; i += 6)
      await Promise.all(
        paths.slice(i, i + 6).map(async (path) => {
          const page = await readMeta(request, path);
          expect(page.robots, path).toMatch(/^index, follow/);
          expect(new URL(page.canonical!).pathname, `${path}: canónica`).toBe(path);
        }),
      );
  });

  test("toda página indexable del catálogo está en el sitemap", async ({ request }) => {
    test.setTimeout(120_000);
    const [inSitemap, linked] = await Promise.all([sitemapPaths(request), indexablePaths(request)]);
    const missing = linked.filter((path) => !inSitemap.includes(path));
    expect(missing, "enlazadas pero fuera del sitemap").toEqual([]);
  });

  test("robots.txt abre el sitio salvo admin, API y styleguide, con bots de IA y sitemap", async ({
    request,
  }) => {
    // En E2E APP_ENV es development (docs/13 §5), que sale igual que producción; el bloqueo total
    // de staging se prueba en src/features/seo/robots.test.ts.
    const response = await request.get("/robots.txt");
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toMatch(/text\/plain/);
    const lines = (await response.text()).split("\n").map((line) => line.trim());
    expect(lines).toContain("User-Agent: *");
    expect(lines).toContain("Allow: /");
    for (const path of ["/admin", "/api/", "/styleguide"])
      expect(lines).toContain(`Disallow: ${path}`);
    expect(lines, "no bloquea todo").not.toContain("Disallow: /");
    for (const bot of ["GPTBot", "ClaudeBot", "PerplexityBot"])
      expect(lines).toContain(`User-Agent: ${bot}`);
    // Las utilidades con noindex no se bloquean: el bot tiene que leer su noindex.
    expect(lines.some((line) => /^Disallow: \/(buscar|cotizacion)/.test(line))).toBe(false);
    const sitemap = lines.find((line) => line.startsWith("Sitemap: "));
    expect(sitemap, "anuncia el sitemap").toBeTruthy();
    expect(new URL(sitemap!.slice("Sitemap: ".length)).pathname).toBe("/sitemap.xml");
  });
});

test.describe("SEO de imágenes (BD-097)", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== "escritorio", "una vez basta");
  });

  test("las fichas publican sus fotos en el sitemap y cada una responde un WebP", async ({
    request,
  }) => {
    const xml = await sitemapXml(request);
    expect(xml).toContain('xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"');
    const images = xmlPaths(xml, "image:loc");
    expect(images.length, "las fotos del Bolik Ultra y del Ultra fino").toBeGreaterThan(10);
    expect(new Set(images).size, "sin repetidas").toBe(images.length);
    for (const image of images) expect(image).toMatch(/^\/media\/products\/[a-z0-9-]+-1920\.webp$/);
    // Las fotos van dentro de la <url> de su ficha.
    const ultra = xml.match(/<url>\s*<loc>[^<]*\/bolik-ultra<\/loc>[\s\S]*?<\/url>/)?.[0] ?? "";
    expect(ultra).toContain("/media/products/bolik-ultra-azul-principal-");
    expect(ultra).not.toContain("/media/products/bolik-ultra-fino-");
    for (let i = 0; i < images.length; i += 6)
      await Promise.all(
        images.slice(i, i + 6).map(async (image) => {
          const response = await request.get(image);
          expect(response.status(), image).toBe(200);
          expect(response.headers()["content-type"], image).toBe("image/webp");
        }),
      );
  });

  test("ninguna imagen sin texto alternativo en las páginas del sitemap (axe)", async ({
    page,
    request,
  }) => {
    test.setTimeout(180_000);
    await skipSplash(page);
    const paths = await sitemapPaths(request);
    const problems: string[] = [];
    for (const path of paths) {
      await page.goto(path);
      const results = await new AxeBuilder({ page })
        .withRules(["image-alt", "role-img-alt", "svg-img-alt", "input-image-alt", "area-alt"])
        .analyze();
      for (const violation of results.violations)
        for (const node of violation.nodes)
          problems.push(`${path}: ${violation.id} en ${node.target.join(" ")}`);
    }
    expect(problems).toEqual([]);
  });
});

type JsonLdBlock = Record<string, unknown> & { "@type": string };

/** Los bloques JSON-LD del HTML, ya leídos (falla si alguno no es JSON válido). */
function jsonLdBlocks(html: string, path: string): JsonLdBlock[] {
  // Con otros atributos también (un nonce de la CSP, BD-142).
  const pattern = /<script[^>]*\btype="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g;
  return [...html.matchAll(pattern)].map((match) => {
    let data: JsonLdBlock;
    try {
      data = JSON.parse(match[1]!) as JsonLdBlock;
    } catch {
      throw new Error(`${path}: JSON-LD inválido: ${match[1]!.slice(0, 80)}`);
    }
    expect(data["@context"], `${path}: @context`).toBe("https://schema.org");
    return data;
  });
}

/** Tipos que pide docs/10 §4 en cada plantilla (además del Organization de todas). */
function expectedTypes(path: string): string[] {
  if (path === "/") return ["WebSite", "FAQPage"];
  if (path === "/productos") return ["CollectionPage", "BreadcrumbList"];
  if (path.split("/").length === 3) return ["CollectionPage", "BreadcrumbList"];
  return ["ProductGroup", "BreadcrumbList"];
}

// Datos estructurados (BD-091, docs/10 §4). Criterio: 0 errores en las plantillas. Aquí: JSON
// válido con @context, los tipos de cada plantilla, una sola organización (el fabricante de cada
// ficha y el publicador del sitio apuntan a su @id) y nada inventado (sin precios ni reseñas).
// La validación con las herramientas de Google y schema.org se hace aparte (doc 14, BD-091).
test.describe("datos estructurados (BD-091)", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== "escritorio", "HTML del servidor: una vez basta");
  });

  test("cada página indexable trae su JSON-LD, una sola Organization y nada inventado", async ({
    request,
  }) => {
    test.setTimeout(120_000);
    const paths = await indexablePaths(request);
    let organizationId: string | null = null;

    for (const path of paths) {
      const response = await request.get(path);
      expect(response.status(), path).toBe(200);
      const blocks = jsonLdBlocks(await response.text(), path);
      expect(blocks.length, `${path}: JSON-LD`).toBeGreaterThan(0);
      const types = blocks.map((block) => block["@type"]);

      const organizations = blocks.filter((block) => block["@type"] === "Organization");
      expect(organizations, `${path}: un Organization`).toHaveLength(1);
      const org = organizations[0]!;
      organizationId ??= org["@id"] as string;
      expect(org["@id"], `${path}: mismo @id`).toBe(organizationId);
      expect(org).toMatchObject({ name: "Bolik", foundingDate: "1966-06" });

      for (const type of expectedTypes(path)) expect(types, `${path}: ${type}`).toContain(type);

      const product = blocks.find((block) => block["@type"] === "ProductGroup");
      if (product)
        expect((product.manufacturer as { "@id": string })["@id"], `${path}: fabricante`).toBe(
          organizationId,
        );
      const site = blocks.find((block) => block["@type"] === "WebSite");
      if (site) {
        expect((site.publisher as { "@id": string })["@id"]).toBe(organizationId);
        const action = site.potentialAction as { target: { urlTemplate: string } };
        expect(action.target.urlTemplate).toMatch(/\/buscar\?q=\{search_term_string\}$/);
      }

      expect(JSON.stringify(blocks), `${path}: sin precios ni reseñas`).not.toMatch(
        /"(price|offers|review|aggregateRating)"/i,
      );
    }
    expect(organizationId).toMatch(/\/#organization$/);
  });

  // «Bolik Ultra» viene del seed de ejemplo (perfil e2e), como en ficha.spec.ts.
  test("el buscador del SearchAction responde con resultados", async ({ request }) => {
    const response = await request.get("/buscar?q=ultra");
    expect(response.status()).toBe(200);
    expect(await response.text()).toContain("Bolik Ultra");
  });
});
