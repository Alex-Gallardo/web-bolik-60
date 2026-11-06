import type { Page } from "@playwright/test";
import { expect, test } from "./helpers";

// Motion diferido (BD-045, docs/09 §7). Criterio: Motion no aparece en el JS inicial de la home.
// Firmas que sobreviven a la minificación (comprobadas en el build): el atributo de animaciones de
// entrada (núcleo de m.*) y transformPagePoint, del valor por defecto de MotionConfigContext (lo trae
// cualquier import de motion/react: LazyMotion, MotionConfig, AnimatePresence…). El control positivo
// de /styleguide exige las dos, así una firma que deje de servir no pasa sin que se note.
const MOTION_SIGNATURES = ["data-framer-appear-id", "transformPagePoint"];

/** Junta el texto de cada script que descarga la página. */
function collectScripts(page: Page) {
  const bodies: Promise<string>[] = [];
  page.on("response", (response) => {
    if (response.request().resourceType() === "script")
      bodies.push(response.text().catch(() => ""));
  });
  /** Las firmas de Motion que aparecen en lo descargado hasta ahora. */
  return async () => {
    const texts = await Promise.all(bodies);
    return MOTION_SIGNATURES.filter((signature) => texts.some((text) => text.includes(signature)));
  };
}

test.describe("Motion diferido", () => {
  test("la home no descarga Motion", async ({ page }) => {
    const motionScripts = collectScripts(page);
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    expect(await motionScripts(), "scripts con Motion en la home").toHaveLength(0);
  });

  test("en /styleguide se descarga solo al usarlo; la línea sale animada y el foco no se pierde", async ({
    page,
  }) => {
    const motionScripts = collectScripts(page);
    await page.goto("/styleguide");
    await page.waitForLoadState("networkidle");
    expect(await motionScripts(), "Motion antes de usarlo").toHaveLength(0);

    const row = page.locator('[data-animation="A-36"]');
    await row.getByRole("button", { name: "Reproducir" }).click();
    const list = row.locator("[data-motion-demo] li");
    await expect(list).toHaveCount(3);
    await page.waitForLoadState("networkidle");
    expect(await motionScripts(), "Motion se descargó al usarlo").toEqual(MOTION_SIGNATURES);

    // Sale animada: un momento después del clic la línea sigue ahí (AnimatePresence) y luego se va.
    await row.getByRole("button", { name: "Quitar Bolik Ultra Negro · Cajilla de 12" }).click();
    await expect(list).toHaveCount(3);
    await expect(list).toHaveCount(2);
    // El foco pasa a la línea siguiente y un aviso cortés anuncia lo que se quitó.
    await expect(
      row.getByRole("button", { name: "Quitar Bolik Ultra Rojo · Cajilla de 12" }),
    ).toBeFocused();
    await expect(row.locator("[aria-live]")).toHaveText(
      "Quitamos Bolik Ultra Negro · Cajilla de 12",
    );
    await row.getByRole("button", { name: "Restaurar" }).click();
    await expect(list).toHaveCount(3);
    await expect(
      row.getByRole("button", { name: "Quitar Bolik Ultra Azul · Cajilla de 12" }),
    ).toBeFocused();
  });
});
