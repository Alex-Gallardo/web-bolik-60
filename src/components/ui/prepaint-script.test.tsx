import { render } from "@testing-library/react";
import { act } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PrepaintScript } from "./prepaint-script";

const code = "window.__prepaint = (window.__prepaint || 0) + 1";

describe("PrepaintScript", () => {
  it("va en el HTML del servidor", () => {
    expect(renderToString(<PrepaintScript code={code} />)).toBe(`<script>${code}</script>`);
  });

  it("al hidratar se conserva el del servidor y después se quita", async () => {
    const container = document.createElement("div");
    container.innerHTML = renderToString(<PrepaintScript code={code} />);
    document.body.append(container);
    await act(async () => {
      hydrateRoot(container, <PrepaintScript code={code} />);
    });
    expect(container.querySelector("script")).toBeNull();
    container.remove();
  });

  it("en una navegación del sitio (render en el navegador) no se dibuja", () => {
    const { container } = render(<PrepaintScript code={code} />);
    expect(container.querySelector("script")).toBeNull();
  });
});
