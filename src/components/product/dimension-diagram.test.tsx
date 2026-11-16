import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { DimensionView } from "@/server/data/types";
import { DimensionDiagram, drawnParts, hasPenDiagram, penGeometry } from "./dimension-diagram";

// Las medidas del Bolik Ultra (seed, docs/17 §3).
const ultra: DimensionView[] = [
  { partKey: "body", label: "Largo del cuerpo", valueMm: 145.83, tolerance: null },
  { partKey: "cap", label: "Largo de la tapa", valueMm: 60.15, tolerance: null },
  { partKey: "tip_length", label: "Largo de la punta", valueMm: 4.35, tolerance: null },
  { partKey: "tip_diameter", label: "Diámetro de la punta", valueMm: 2.69, tolerance: null },
  { partKey: "mark", label: "Largo de la marca", valueMm: 8.27, tolerance: "±1" },
];
const without = (...parts: string[]) => ultra.filter((d) => !parts.includes(d.partKey));

describe("DimensionDiagram (BD-063)", () => {
  it("solo hay diagrama con el largo del cuerpo mayor que 0 (un bolígrafo)", () => {
    expect(hasPenDiagram(ultra)).toBe(true);
    expect(hasPenDiagram(without("body"))).toBe(false);
    expect(hasPenDiagram([{ ...ultra[0]!, valueMm: 0 }])).toBe(false);
    expect(hasPenDiagram([])).toBe(false);
  });

  it("dibuja a escala; la punta, con un mínimo para que se vea a 360 px", () => {
    const g = penGeometry(ultra);
    expect(g.body.x2 - g.body.x1).toBeCloseTo(145.83 * 3.4);
    expect(g.cap!.x2 - g.cap!.x1).toBeCloseTo(60.15 * 3.4);
    expect(g.tip!.x1).toBe(g.body.x2);
    // 4.35 mm × 3.4 ≈ 15: se dibuja de 24; el diámetro (≈ 9) de 10.
    expect(g.tip!.x2 - g.tip!.x1).toBe(24);
    expect(g.tip!.d).toBe(10);
    expect(g.width).toBeGreaterThan(g.tip!.x2 + 100);
  });

  it("una parte que falta no se dibuja ni se ofrece", () => {
    expect(drawnParts(ultra).map((d) => d.partKey)).toEqual([
      "body",
      "cap",
      "tip_length",
      "tip_diameter",
      "mark",
    ]);
    // Sin diámetro: la punta va con su largo; sin la cota ni el radio del diámetro.
    const noDiameter = penGeometry(without("tip_diameter"));
    expect(noDiameter.hasTipDiameter).toBe(false);
    expect(drawnParts(without("tip_diameter")).map((d) => d.partKey)).not.toContain("tip_diameter");
    // Sin largo de la punta, pero con diámetro: se dibuja la punta y se ofrece solo el diámetro.
    const noLength = without("tip_length");
    expect(penGeometry(noLength).tip).not.toBeNull();
    expect(drawnParts(noLength).map((d) => d.partKey)).toEqual([
      "body",
      "cap",
      "tip_diameter",
      "mark",
    ]);
    // Una tapa de 0 mm no se dibuja ni se ofrece.
    const zeroCap = ultra.map((d) => (d.partKey === "cap" ? { ...d, valueMm: 0 } : d));
    expect(penGeometry(zeroCap).cap).toBeNull();
    expect(drawnParts(zeroCap).map((d) => d.partKey)).not.toContain("cap");
    // Repetida en los datos: una sola vez.
    expect(drawnParts([...ultra, ultra[0]!]).filter((d) => d.partKey === "body")).toHaveLength(1);
  });

  it("es una imagen con nombre, empieza en «Todas» y cada parte es un radio con su evento", () => {
    render(<DimensionDiagram id="cota" productName="Bolik Ultra" dimensions={ultra} />);
    expect(screen.getByRole("img", { name: "Diagrama de medidas del Bolik Ultra" })).toBeTruthy();
    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(6);
    expect((screen.getByRole("radio", { name: "Todas" }) as HTMLInputElement).checked).toBe(true);
    expect(screen.getByRole("radio", { name: "Todas" }).hasAttribute("data-event")).toBe(false);
    const mark = screen.getByRole("radio", { name: /Largo de la marca 8.27 mm \(±1\)/ });
    expect(mark.getAttribute("data-event")).toBe("dimension_open");
    expect(mark.getAttribute("data-part")).toBe("mark");
    expect(document.querySelectorAll("svg [data-part]")).toHaveLength(5);
  });

  it("sin diámetro no hay grupo del diámetro en el dibujo", () => {
    render(
      <DimensionDiagram id="cota" productName="Bolik Ultra" dimensions={without("tip_diameter")} />,
    );
    expect(document.querySelector('svg [data-part="tip_diameter"]')).toBeNull();
    expect(document.querySelector('svg [data-part="tip_length"]')).not.toBeNull();
  });
});
