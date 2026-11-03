// @vitest-environment node
import { describe, expect, it } from "vitest";
import { cn } from "./cn";

describe("cn", () => {
  it("une clases condicionales", () => {
    expect(cn("px-4", false && "hidden", undefined, ["py-2", { "font-bold": true }])).toBe(
      "px-4 py-2 font-bold",
    );
  });

  it("la última clase gana entre colores de marca", () => {
    expect(cn("text-ink", "text-blue")).toBe("text-blue");
    expect(cn("bg-blue", "bg-soft")).toBe("bg-soft");
  });

  it("no confunde color de texto con tamaño de texto", () => {
    expect(cn("text-ink", "text-lg")).toBe("text-ink text-lg");
  });

  it("resuelve radios, sombras y fuentes propios del tema", () => {
    expect(cn("rounded-md", "rounded-xl")).toBe("rounded-xl");
    expect(cn("shadow-md", "shadow-kids")).toBe("shadow-kids");
    expect(cn("font-display", "font-kids")).toBe("font-kids");
  });
});
