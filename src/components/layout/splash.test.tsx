import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Splash } from "./splash";

describe("Splash (BD-043)", () => {
  it("es decorativo: aria-hidden, sin nada enfocable, sin <img> ni texto (no compite por el LCP)", () => {
    const { container } = render(<Splash />);
    const overlay = container.querySelector(".splash")!;
    expect(overlay.getAttribute("aria-hidden")).toBe("true");
    expect(overlay.querySelector("a, button, input, [tabindex]")).toBeNull();
    expect(overlay.querySelector("img")).toBeNull();
    expect(overlay.textContent?.trim()).toBe("");
    // El wordmark oficial (SVG en línea) y el trazo que se dibuja con pathLength 1.
    expect(overlay.querySelector(".splash__word")?.tagName.toLowerCase()).toBe("svg");
    expect(overlay.querySelector(".splash__ink path")?.getAttribute("pathLength")).toBe("1");
  });
});
