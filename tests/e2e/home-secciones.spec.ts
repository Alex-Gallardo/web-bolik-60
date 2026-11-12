import { collectConsoleErrors, expect, expectNoA11yViolations, skipSplash, test } from "./helpers";

// Secciones de la home (BD-051): «Un Bolik para cada etapa» y el catálogo destacado.
test.beforeEach(async ({ page }) => {
  await skipSplash(page);
});

test.describe("home: soluciones y catálogo (BD-051)", () => {
  test("las tarjetas de público enlazan a rutas reales, sin errores y pasa axe", async ({
    page,
  }) => {
    const errors = collectConsoleErrors(page);
    await page.goto("/");
    const solutions = page.getByRole("region", { name: "Un Bolik para cada etapa" });
    await solutions.scrollIntoViewIfNeeded();
    const hrefs = await solutions
      .getByRole("link")
      .evaluateAll((links) => links.map((a) => a.getAttribute("href")));
    expect(hrefs).toEqual([
      "/escuelas",
      "/empresas",
      "/empresas",
      "/mayoreo",
      "/mayoreo#distribuidor",
    ]);
    await expectNoA11yViolations(page);
    expect(errors, "errores en la consola").toEqual([]);
  });

  test("en móvil las tarjetas son un carrusel que no desborda la página", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name === "escritorio", "carrusel de móvil");
    await page.goto("/");
    const list = page.getByRole("region", { name: "Un Bolik para cada etapa" }).getByRole("list");
    const { scroll, client } = await list.evaluate((el) => ({
      scroll: el.scrollWidth,
      client: el.clientWidth,
    }));
    expect(scroll).toBeGreaterThan(client);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBe(0);
  });

  test("a 360, 768 y 1024 px nada desborda (página ni títulos de tarjeta)", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "escritorio", "los anchos se fijan aquí");
    for (const width of [360, 768, 1024]) {
      await page.setViewportSize({ width, height: 800 });
      await page.goto("/");
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `página a ${width} px`).toBe(0);
      const clipped = await page
        .getByRole("region", { name: "Un Bolik para cada etapa" })
        .getByRole("heading", { level: 3 })
        .evaluateAll((titles) =>
          titles.filter((h) => h.scrollWidth > h.clientWidth).map((h) => h.textContent),
        );
      expect(clipped, `títulos cortados a ${width} px`).toEqual([]);
    }
  });

  test("el buscador manda a /buscar con la consulta", async ({ page }) => {
    await page.goto("/");
    const catalog = page.getByRole("region", { name: "Encuentra lo que necesitas" });
    await catalog.getByRole("searchbox", { name: "Buscar en el catálogo" }).fill("ultra");
    await catalog.getByRole("button", { name: "Buscar" }).click();
    await expect(page).toHaveURL(/\/buscar\?q=ultra$/);
  });

  test("chips de línea y categorías enlazan al catálogo", async ({ page }) => {
    await page.goto("/");
    const catalog = page.getByRole("region", { name: "Encuentra lo que necesitas" });
    await expect(
      catalog.getByRole("list", { name: "Líneas de producto" }).getByRole("link"),
    ).toHaveCount(4);
    await expect(catalog.getByRole("link", { name: "Escolar", exact: true })).toHaveAttribute(
      "href",
      "/productos?linea=escolar",
    );
    const cards = catalog.getByRole("heading", { level: 3 });
    await expect(cards).toHaveCount(8);
    await expect(catalog.getByRole("link", { name: /Bolígrafos/ }).first()).toHaveAttribute(
      "href",
      "/productos/boligrafos",
    );
    await expect(catalog.getByRole("link", { name: "Ver todo el catálogo" })).toHaveAttribute(
      "href",
      "/productos",
    );
  });
});

test.describe("home sin JavaScript (BD-051)", () => {
  test.use({ javaScriptEnabled: false });

  test("las tarjetas y el buscador se ven", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("region", { name: "Un Bolik para cada etapa" }).getByRole("link").first(),
    ).toBeVisible();
    await expect(page.getByRole("searchbox", { name: "Buscar en el catálogo" })).toBeVisible();
    await expect(
      page.getByRole("region", { name: "Encuentra lo que necesitas" }).getByRole("heading", {
        level: 3,
      }),
    ).toHaveCount(8);
  });
});

// Cifras y producto estrella (BD-052).
test.describe("home: cifras y Bolik Ultra (BD-052)", () => {
  test("cifras publicadas con el número final y el Ultra con sus CTA, pasa axe", async ({
    page,
  }) => {
    const errors = collectConsoleErrors(page);
    await page.goto("/");
    const stats = page.getByRole("region", { name: "Bolik en cifras" });
    // Solo «60 años» está publicada en prisma/seed/content.json; las «(validar)» de docs/17 no
    // salen. Si Mercadeo publica otra cifra, este número cambia.
    await expect(stats.getByRole("listitem")).toHaveCount(1);
    await expect(stats).toContainText("años escribiendo con Guatemala");
    await expect(stats).not.toContainText("puntos de venta");

    const ultra = page.getByRole("region", { name: "Bolik Ultra" });
    await ultra.scrollIntoViewIfNeeded();
    for (const chip of ["Azul · PT00058", "Negro · PT00059", "Rojo · PT00060"]) {
      await expect(ultra.getByText(chip)).toBeVisible();
    }
    await expect(ultra.getByRole("link", { name: "Ver ficha del Bolik Ultra" })).toHaveAttribute(
      "href",
      "/productos/boligrafos/bolik-ultra",
    );
    await expect(ultra.getByRole("link", { name: "Dónde comprar" })).toHaveAttribute(
      "href",
      "/donde-comprar",
    );
    await expectNoA11yViolations(page);
    expect(errors, "errores en la consola").toEqual([]);
  });
});

test.describe("cifras sin JavaScript (BD-052)", () => {
  test.use({ javaScriptEnabled: false });

  test("el número final se ve sin JS", async ({ page }) => {
    await page.goto("/");
    const stats = page.getByRole("region", { name: "Bolik en cifras" });
    await expect(stats.locator(".sr-only", { hasText: /^60$/ })).toHaveCount(1);
    await expect(stats.getByText("años escribiendo con Guatemala")).toBeVisible();
    await expect(
      page
        .getByRole("region", { name: "Bolik Ultra" })
        .getByRole("link", { name: "Ver ficha del Bolik Ultra" }),
    ).toBeVisible();
  });
});

// Escuelas, mayoreo, dónde comprar e historia (BD-053).
test.describe("home: escuelas, mayoreo, dónde comprar e historia (BD-053)", () => {
  // Con movimiento reducido todo está revelado: axe mide el contraste de cada tarjeta, no una a
  // media transición.
  test.use({ reducedMotion: "reduce" });

  test("enlaces de compra en línea seguros y con retailer_click, pasa axe", async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await page.goto("/");
    const where = page.getByRole("region", { name: "Bolik está cerca de ti" });
    await where.scrollIntoViewIfNeeded();
    for (const name of ["Walmart", "La Torre"]) {
      const link = where.getByRole("link", { name: new RegExp(`^Comprar en ${name}`) });
      await expect(link).toHaveAttribute("target", "_blank");
      await expect(link).toHaveAttribute("rel", "noopener noreferrer");
      await expect(link).toHaveAttribute("data-event", "retailer_click");
      await expect(link).toHaveAttribute("href", /^https:\/\//);
    }
    await expect(
      page.getByRole("region", { name: "Bolik en tu escuela" }).getByRole("link", {
        name: "Lleva Bolik a tu escuela",
      }),
    ).toHaveAttribute("href", "/escuelas");
    await expect(
      page.getByRole("region", { name: "Mayoreo y empresas" }).getByRole("link", {
        name: "Cotizar por mayor",
      }),
    ).toHaveAttribute("href", "/mayoreo");
    // Solo los hitos verificados de prisma/seed/content.json (1966 y 2026).
    const history = page.getByRole("region", { name: "60 años escribiendo con Guatemala" });
    await expect(history.getByRole("listitem")).toHaveCount(2);
    await expectNoA11yViolations(page);
    expect(errors, "errores en la consola").toEqual([]);
  });

  test("el selector de departamento manda a /donde-comprar con el departamento", async ({
    page,
  }) => {
    await page.goto("/");
    const where = page.getByRole("region", { name: "Bolik está cerca de ti" });
    await where.getByRole("combobox", { name: "Elige tu departamento" }).selectOption("guatemala");
    await where.getByRole("button", { name: "Ver tiendas" }).click();
    // /donde-comprar llega con BD-080: hoy se comprueba solo la URL que arma el formulario.
    await expect(page).toHaveURL(/\/donde-comprar\?departamento=guatemala$/);
  });

  test("el foco se ve sobre el fondo sun de escuelas", async ({ page }) => {
    await page.goto("/");
    const cta = page.getByRole("link", { name: "Lleva Bolik a tu escuela" });
    await cta.focus();
    const { outline, background } = await cta.evaluate((el) => ({
      outline: getComputedStyle(el).outlineColor,
      background: getComputedStyle(el.closest("section")!).backgroundColor,
    }));
    expect(outline).not.toBe(background);
    expect(outline).toBe("rgb(17, 19, 24)"); // --ink
  });
});

test.describe("secciones de la home sin JavaScript (BD-053)", () => {
  test.use({ javaScriptEnabled: false });

  test("actividades, mayoreo, formulario e hitos con la línea completa", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("region", { name: "Bolik en tu escuela" }).getByRole("article"),
    ).toHaveCount(4);
    await expect(
      page.getByRole("region", { name: "Mayoreo y empresas" }).getByRole("link", {
        name: "Cotizar por mayor",
      }),
    ).toBeVisible();
    await expect(page.getByRole("combobox", { name: "Elige tu departamento" })).toBeVisible();
    const history = page.getByRole("region", { name: "60 años escribiendo con Guatemala" });
    await expect(history.getByRole("listitem")).toHaveCount(2);
    const transform = await history
      .locator(".timeline-line")
      .evaluate((el) => getComputedStyle(el).transform);
    expect(transform).toBe("none");
  });
});

// Kits, preguntas frecuentes, CTA final y apariencia por sección (BD-054).
test.describe("home: kits, FAQ y cierre (BD-054)", () => {
  test.use({ reducedMotion: "reduce" });

  test("6 preguntas en acordeón con su FAQPage, CTA final y sin kits apagados", async ({
    page,
  }) => {
    const errors = collectConsoleErrors(page);
    await page.goto("/");
    const faq = page.getByRole("region", { name: "Preguntas frecuentes" });
    const summaries = faq.locator("details > summary");
    await expect(summaries).toHaveCount(6);
    // Se abre de a una (name del <details>).
    await summaries.nth(0).click();
    await expect(faq.locator("details").nth(0)).toHaveAttribute("open", "");
    await summaries.nth(1).click();
    await expect(faq.locator("details").nth(0)).not.toHaveAttribute("open", "");
    await expect(faq.locator("details").nth(1)).toHaveAttribute("open", "");

    // Un solo FAQPage, con las mismas preguntas que se ven.
    const blocks = await page
      .locator('script[type="application/ld+json"]')
      .evaluateAll((scripts) => scripts.map((s) => JSON.parse(s.textContent ?? "{}")));
    const faqPages = blocks.filter((b) => b["@type"] === "FAQPage");
    expect(faqPages).toHaveLength(1);
    expect(faqPages[0].mainEntity.map((q: { name: string }) => q.name)).toEqual(
      await summaries.allTextContents(),
    );

    const cta = page.getByRole("region", { name: "¿Compras por mayor?" });
    await expect(cta.getByRole("link", { name: "Armar mi cotización" })).toHaveAttribute(
      "href",
      "/cotizacion",
    );
    // settings.json no trae número de WhatsApp: sin número no hay botón (nunca uno roto).
    await expect(cta.getByRole("link", { name: /WhatsApp/ })).toHaveCount(0);
    // kits_enabled = false en settings.json: la sección de kits no sale.
    await expect(page.getByRole("region", { name: "Kits escolares 2027" })).toHaveCount(0);
    await expectNoA11yViolations(page);
    expect(errors, "errores en la consola").toEqual([]);
  });

  for (const bg of ["navy", "brand"]) {
    test(`con fondo ${bg} en todas las secciones (como lo elegiría el admin), se lee y pasa axe`, async ({
      page,
    }) => {
      await page.goto("/");
      // Lo que hace <Section> con un SectionAppearance oscuro: data-bg y data-tone del fondo guardado.
      const changed = await page.evaluate((preset) => {
        const sections = [...document.querySelectorAll("main section[data-bg]")];
        for (const section of sections) {
          section.setAttribute("data-bg", preset);
          section.setAttribute("data-tone", "dark");
        }
        return sections.length;
      }, bg);
      expect(changed).toBeGreaterThanOrEqual(10);
      // axe deja un contraste de 1:1 como «incompleto» (texto oculto a propósito): una tarjeta
      // blanca (data-tone="light") se compara aparte, título contra fondo de la tarjeta.
      const card = page
        .getByRole("region", { name: "Encuentra lo que necesitas" })
        .locator('[data-tone="light"]')
        .first();
      const { heading, background } = await card.evaluate((el) => ({
        heading: getComputedStyle(el.querySelector("h3")!).color,
        background: getComputedStyle(el).backgroundColor,
      }));
      expect(heading).not.toBe(background);
      expect(heading).toBe("rgb(17, 19, 24)"); // --ink
      await expectNoA11yViolations(page);
    });
  }
});

test.describe("FAQ de la home sin JavaScript (BD-054)", () => {
  test.use({ javaScriptEnabled: false });

  test("las respuestas están en el HTML y el acordeón abre", async ({ page }) => {
    await page.goto("/");
    const faq = page.getByRole("region", { name: "Preguntas frecuentes" });
    const first = faq.locator("details").first();
    await expect(first).toContainText("En Guatemala.");
    await first.locator("summary").click();
    await expect(first.getByText(/^En Guatemala\./)).toBeVisible();
  });
});
