import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { ui } from "@/content/ui";
import { Accordion } from "./accordion";
import { Button } from "./button";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "./dialog";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { Sheet, SheetContent, SheetTrigger } from "./sheet";
import { Tabs } from "./tabs";

let mobile = false;
beforeAll(() => {
  // jsdom no trae matchMedia: Tabs lo usa para el modo acordeón.
  window.matchMedia = ((query: string) => ({
    matches: query.includes("width <") ? mobile : !mobile,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
});

// Si una prueba en modo móvil falla, las siguientes no deben heredarlo.
afterEach(() => {
  mobile = false;
});

const ITEMS = [
  { value: "especificaciones", label: "Especificaciones", content: <p>Punta 1.0 mm</p> },
  { value: "medidas", label: "Medidas", content: <p>Largo 145 mm</p> },
  { value: "seguridad", label: "Seguridad", content: <p>No ingerir</p> },
];

describe("Tabs", () => {
  it("patrón WAI-ARIA: una pestaña activa en el orden de tabulación y todos los paneles en el DOM", () => {
    render(<Tabs label="Información" items={ITEMS} />);
    const tabs = screen.getAllByRole("tab");
    expect(tabs.map((t) => t.getAttribute("aria-selected"))).toEqual(["true", "false", "false"]);
    expect(tabs.map((t) => t.tabIndex)).toEqual([0, -1, -1]);
    expect(screen.getByRole("tablist", { name: "Información" })).toBeTruthy();
    // Todo el contenido está en el HTML; el CSS oculta los inactivos solo con la clase js.
    for (const text of ["Punta 1.0 mm", "Largo 145 mm", "No ingerir"])
      expect(screen.getByText(text)).toBeTruthy();
    const panel = document.getElementById(tabs[0]!.getAttribute("aria-controls")!)!;
    expect(panel.getAttribute("role")).toBe("tabpanel");
    expect(panel.hasAttribute("data-active")).toBe(true);
  });

  it("flechas, Inicio y Fin mueven el foco y eligen", () => {
    render(<Tabs label="Información" items={ITEMS} />);
    const tabs = screen.getAllByRole("tab");
    tabs[0]!.focus();
    fireEvent.keyDown(tabs[0]!, { key: "ArrowRight" });
    expect(document.activeElement).toBe(tabs[1]);
    expect(tabs[1]!.getAttribute("aria-selected")).toBe("true");
    fireEvent.keyDown(tabs[1]!, { key: "End" });
    expect(document.activeElement).toBe(tabs[2]);
    fireEvent.keyDown(tabs[2]!, { key: "ArrowRight" });
    expect(document.activeElement).toBe(tabs[0]);
    fireEvent.keyDown(tabs[0]!, { key: "ArrowLeft" });
    expect(document.activeElement).toBe(tabs[2]);
    fireEvent.keyDown(tabs[2]!, { key: "Home" });
    expect(tabs[0]!.getAttribute("aria-selected")).toBe("true");
  });

  it("en móvil es un acordeón: encabezados con aria-expanded y paneles region", async () => {
    mobile = true;
    render(<Tabs label="Información" items={ITEMS} headingLevel={4} />);
    const header = screen.getByRole("button", { name: "Medidas" });
    expect(header.getAttribute("aria-expanded")).toBe("false");
    expect(header.closest("h4")).not.toBeNull();
    fireEvent.click(header);
    expect(header.getAttribute("aria-expanded")).toBe("true");
    const panel = document.getElementById(header.getAttribute("aria-controls")!)!;
    await waitFor(() => expect(panel.getAttribute("role")).toBe("region"));
    expect(panel.hasAttribute("data-open")).toBe(true);
    // Otro encabezado cierra el anterior; el mismo lo cierra.
    fireEvent.click(screen.getByRole("button", { name: "Seguridad" }));
    expect(header.getAttribute("aria-expanded")).toBe("false");
  });

  it("valor inicial inexistente: la primera queda alcanzable; sin pestañas no dibuja nada", () => {
    const { container, rerender } = render(
      <Tabs label="Información" items={ITEMS} defaultValue="no-existe" />,
    );
    const tabs = screen.getAllByRole("tab");
    expect(tabs[0]!.tabIndex).toBe(0);
    fireEvent.keyDown(tabs[0]!, { key: "ArrowLeft" });
    expect(tabs[2]!.getAttribute("aria-selected")).toBe("true");
    rerender(<Tabs label="Información" items={[]} />);
    expect(container.innerHTML).toBe("");
  });

  it("con Alt, Ctrl o Cmd no mueve nada (Alt+← es «atrás»)", () => {
    render(<Tabs label="Información" items={ITEMS} />);
    const tabs = screen.getAllByRole("tab");
    fireEvent.keyDown(tabs[0]!, { key: "ArrowRight", altKey: true });
    expect(tabs[0]!.getAttribute("aria-selected")).toBe("true");
  });
});

describe("Accordion", () => {
  it("usa <details>: el contenido cerrado está en el HTML y `exclusive` abre de a uno", () => {
    const { container } = render(
      <Accordion
        exclusive="faq"
        items={[
          { id: "punta", title: "¿Qué punta tiene?", content: <p>Mediana de 1.0 mm.</p> },
          { title: "¿Dónde se fabrica?", content: <p>En Guatemala.</p> },
        ]}
      />,
    );
    const details = container.querySelectorAll("details");
    expect(details).toHaveLength(2);
    expect([...details].every((d) => d.getAttribute("name") === "faq" && !d.open)).toBe(true);
    expect(details[0]!.id).toBe("punta");
    expect(container.textContent).toContain("Mediana de 1.0 mm.");
    expect(container.querySelector("summary")?.textContent).toBe("¿Qué punta tiene?");
  });
});

describe("Dialog, Sheet y Popover", () => {
  it("Dialog: título, botón Cerrar, Escape cierra y el foco vuelve al disparador", async () => {
    render(
      <Dialog>
        <DialogTrigger asChild>
          <Button>Abrir</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogTitle>Precio de fábrica</DialogTitle>
          <DialogDescription>Por cajilla o fardo.</DialogDescription>
        </DialogContent>
      </Dialog>,
    );
    const trigger = screen.getByRole("button", { name: "Abrir" });
    fireEvent.click(trigger);
    const dialog = await screen.findByRole("dialog", { name: "Precio de fábrica" });
    expect(screen.getByRole("button", { name: ui.overlays.close })).toBeTruthy();
    fireEvent.keyDown(dialog, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(document.activeElement).toBe(trigger);
  });

  it("Sheet: lado, título visible y pie fijo", async () => {
    render(
      <Sheet>
        <SheetTrigger asChild>
          <Button>Filtros</Button>
        </SheetTrigger>
        <SheetContent side="right" title="Filtrar" footer={<button type="button">Listo</button>}>
          <p>Contenido</p>
        </SheetContent>
      </Sheet>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Filtros" }));
    const sheet = await screen.findByRole("dialog", { name: "Filtrar" });
    expect(sheet.getAttribute("data-side")).toBe("right");
    expect(screen.getByRole("heading", { level: 2, name: "Filtrar" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Listo" })).toBeTruthy();
  });

  it("Popover: se abre junto al disparador", async () => {
    render(
      <Popover>
        <PopoverTrigger asChild>
          <Button>¿Qué es una cajilla?</Button>
        </PopoverTrigger>
        <PopoverContent title="Cajilla">Una caja de tienda.</PopoverContent>
      </Popover>,
    );
    fireEvent.click(screen.getByRole("button", { name: "¿Qué es una cajilla?" }));
    expect(await screen.findByRole("dialog", { name: "Cajilla" })).toBeTruthy();
    expect(screen.getByText("Una caja de tienda.")).toBeTruthy();
  });
});
