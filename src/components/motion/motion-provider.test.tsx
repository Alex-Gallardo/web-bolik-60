import { act, render, screen } from "@testing-library/react";
import { MotionConfigContext } from "motion/react";
import { useContext } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { MotionProvider } from "./motion-provider";

/** Muestra la configuración de movimiento reducido que ve un hijo del provider. */
function Probe() {
  const { reducedMotion } = useContext(MotionConfigContext);
  return <p>reducido: {reducedMotion}</p>;
}

afterEach(() => document.documentElement.removeAttribute("data-reduced-motion"));

describe("MotionProvider (BD-045)", () => {
  it("pinta a sus hijos y respeta la preferencia del sistema", () => {
    render(
      <MotionProvider>
        <Probe />
      </MotionProvider>,
    );
    expect(screen.getByText("reducido: user")).toBeTruthy();
  });

  it("el interruptor de /styleguide fuerza el movimiento reducido", async () => {
    render(
      <MotionProvider layout>
        <Probe />
      </MotionProvider>,
    );
    await act(async () => {
      document.documentElement.setAttribute("data-reduced-motion", "");
    });
    expect(screen.getByText("reducido: always")).toBeTruthy();
    await act(async () => {
      document.documentElement.removeAttribute("data-reduced-motion");
    });
    expect(screen.getByText("reducido: user")).toBeTruthy();
  });
});
