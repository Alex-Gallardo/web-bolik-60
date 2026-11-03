import AxeBuilder from "@axe-core/playwright";
import { test as base, expect, type Page, type TestInfo } from "@playwright/test";

/** Clave de sessionStorage con la que el splash (BD-04x) sabe que ya se mostró en la sesión. */
export const SPLASH_KEY = "bolik_splash";

/** Marca el splash como ya visto antes de que cargue la página (docs/13 §2). */
export async function skipSplash(page: Page) {
  await page.addInitScript((key) => window.sessionStorage.setItem(key, "1"), SPLASH_KEY);
}

/**
 * Avisos de consola conocidos que no son errores de la página. Cada uno dice cuándo se quita.
 * - Safari avisa que la CSP Report-Only no tiene `report-to`: se resuelve en BD-142.
 */
const KNOWN_CONSOLE_ERRORS = [/delivered in report-only mode, but does not specify a 'report-to'/];

/**
 * Junta los errores de consola y las excepciones de la página desde este momento (llamar antes
 * de `page.goto`). Al final de la prueba: `expect(errors).toEqual([])`.
 */
export function collectConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  const add = (text: string) => {
    if (!KNOWN_CONSOLE_ERRORS.some((known) => known.test(text))) errors.push(text);
  };
  page.on("console", (msg) => {
    if (msg.type() === "error") add(msg.text());
  });
  page.on("pageerror", (error) => add(error.message));
  return errors;
}

/** Impactos de axe que fallan la prueba (docs/13: 0 violaciones serias o críticas). */
const BLOCKING_IMPACTS = new Set(["serious", "critical"]);

/**
 * Revisa la página con axe (WCAG 2.0 y 2.1, niveles A y AA). Adjunta el resultado completo al
 * reporte y falla solo con violaciones serias o críticas, nombrando la regla y los nodos.
 */
export async function expectNoA11yViolations(page: Page, testInfo: TestInfo = test.info()) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  await testInfo.attach("axe", {
    body: JSON.stringify(results.violations, null, 2),
    contentType: "application/json",
  });
  const blocking = results.violations
    .filter((v) => v.impact && BLOCKING_IMPACTS.has(v.impact))
    .map((v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`);
  expect(blocking, "violaciones de accesibilidad serias o críticas").toEqual([]);
}

type Options = {
  /** `true` en la prueba del splash: no se salta. */
  showSplash: boolean;
};

/**
 * `test` de las pruebas E2E: salta el splash en todas, salvo con `test.use({ showSplash: true })`.
 * Importa `test` y `expect` de aquí, no de @playwright/test.
 */
export const test = base.extend<Options>({
  showSplash: [false, { option: true }],
  page: async ({ page, showSplash }, use) => {
    if (!showSplash) await skipSplash(page);
    await use(page);
  },
});

export { expect };
