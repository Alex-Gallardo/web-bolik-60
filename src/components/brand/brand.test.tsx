import { readFileSync } from "node:fs";
import { render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Illustration, type IllustrationName } from "./illustration";
import { Logo } from "./logo";

describe("Logo", () => {
  it.each(["full", "inverse", "wordmark"] as const)(
    "la variante %s se anuncia como «Bolik»",
    (variant) => {
      render(<Logo variant={variant} />);
      expect(screen.getByRole("img", { name: "Bolik" })).toBeTruthy();
    },
  );

  it("usa el archivo de cada versión y nunca baja de 96 px de ancho", () => {
    render(<Logo variant="inverse" width={40} />);
    const img = screen.getByRole("img", { name: "Bolik" });
    expect(img.getAttribute("src")).toBe("/brand/bolik-logo-white.svg");
    expect(img.getAttribute("width")).toBe("96");
    expect(img.getAttribute("loading")).toBe("lazy");
  });

  it("un ancho inválido cae al valor por defecto", () => {
    render(<Logo width={Number.NaN} />);
    expect(screen.getByRole("img", { name: "Bolik" }).getAttribute("width")).toBe("200");
  });

  it("el wordmark toma el color del texto", () => {
    render(<Logo variant="wordmark" className="text-paper" />);
    const svg = screen.getByRole("img", { name: "Bolik" });
    expect(svg.querySelector("path")?.getAttribute("fill")).toBe("currentColor");
    expect(svg.getAttribute("class")).toContain("text-paper");
  });

  it("los archivos del logo existen y pesan menos de 25 KB", () => {
    for (const file of ["bolik-logo.svg", "bolik-logo-white.svg"]) {
      const svg = readFileSync(`public/brand/${file}`, "utf8");
      expect(svg.startsWith("<svg")).toBe(true);
      expect(Buffer.byteLength(svg)).toBeLessThan(25 * 1024);
      // Nada ejecutable dentro de un SVG servido desde el sitio.
      expect(svg).not.toMatch(
        /<script|<foreignObject|<image|<style|href=|javascript:|\son[a-z]+=/i,
      );
    }
  });
});

describe("Illustration", () => {
  const names: IllustrationName[] = [
    "success",
    "error",
    "empty",
    "no-results",
    "offline",
    "error-cloud",
    "question",
  ];

  it.each(names)("%s pesa menos de 3 KB", (name) => {
    const html = renderToStaticMarkup(<Illustration name={name} />);
    expect(Buffer.byteLength(html)).toBeLessThan(3 * 1024);
  });

  it("es decorativa por defecto y se anuncia si lleva título", () => {
    const { container, rerender } = render(<Illustration name="empty" />);
    expect(container.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
    rerender(<Illustration name="empty" title="Tu cotización está vacía" />);
    expect(screen.getByRole("img", { name: "Tu cotización está vacía" })).toBeTruthy();
  });
});
