import { afterEach, describe, expect, it } from "vitest";
import { colorPrepaintScript, variantStyles } from "./variant-color";

describe("color de la ficha sin JS (BD-062)", () => {
  it("una regla por color, solo con claves seguras", () => {
    const css = variantStyles("ficha", ["azul", "rojo", 'x"]{}*{color:red']);
    expect(css).toBe(
      '#ficha:has(input[name="color"][value="azul"]:checked) [data-color-variant="azul"]{display:block}' +
        '#ficha:has(input[name="color"][value="rojo"]:checked) [data-color-variant="rojo"]{display:block}',
    );
  });

  describe("script previo al pintado", () => {
    afterEach(() => {
      document.body.innerHTML = "";
      window.history.replaceState(null, "", "/");
    });

    function render() {
      document.body.innerHTML = `<div id="ficha">
        <input type="radio" name="color" value="azul" checked>
        <input type="radio" name="color" value="rojo">
      </div>`;
      new Function(colorPrepaintScript("ficha", ["azul", "rojo"]))();
      return document.querySelector<HTMLInputElement>('input[name="color"]:checked')!.value;
    }

    it("marca el color de ?color=", () => {
      window.history.replaceState(null, "", "/productos/boligrafos/bolik-ultra?color=rojo");
      expect(render()).toBe("rojo");
    });

    it("ignora un color que no existe o la falta de parámetro", () => {
      window.history.replaceState(null, "", "/x?color=verde");
      expect(render()).toBe("azul");
      window.history.replaceState(null, "", "/x");
      expect(render()).toBe("azul");
    });
  });
});
