import { readFileSync } from "node:fs";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ui } from "@/content/ui";
import { contrastRatio } from "@/lib/contrast";
import { cn } from "@/lib/cn";
import { Button, buttonVariants } from "./button";

describe("Button", () => {
  it("es un <button type=button> con la variante y el tamaño por defecto", () => {
    render(<Button>Ver productos</Button>);
    const button = screen.getByRole("button", { name: "Ver productos" });
    expect(button.getAttribute("type")).toBe("button");
    const classes = button.className.split(" ");
    expect(classes).toContain("bg-blue");
    expect(classes).toContain("min-h-12.5");
    expect(classes).toContain("press");
    // Un botón que no carga no dibuja región de aviso.
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("respeta type=submit y mezcla clases propias", () => {
    render(
      <Button type="submit" className="mt-4">
        Enviar
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Enviar" });
    expect(button.getAttribute("type")).toBe("submit");
    expect(button.className).toContain("mt-4");
  });

  it("con loading se deshabilita sin perder el foco, no dispara clics y anuncia «Enviando…»", () => {
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Enviar cotización
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Enviar cotización" });
    // aria-disabled y no disabled: un botón nativo deshabilitado suelta el foco.
    expect(button).toHaveProperty("disabled", false);
    expect(button.getAttribute("aria-disabled")).toBe("true");
    expect(button.getAttribute("aria-busy")).toBe("true");
    button.focus();
    expect(document.activeElement).toBe(button);
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
    expect(screen.getByRole("status").textContent).toBe(ui.loading.sending);
    // El texto del botón se mantiene y el spinner es decorativo.
    expect(button.textContent).toBe("Enviar cotización");
    expect(button.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
  });

  it("anuncia otro texto de carga y no anuncia nada cuando no carga", () => {
    const { rerender } = render(
      <Button loading={false} loadingText={ui.loading.saving}>
        Guardar
      </Button>,
    );
    expect(screen.getByRole("status").textContent).toBe("");
    rerender(
      <Button loading loadingText={ui.loading.saving}>
        Guardar
      </Button>,
    );
    expect(screen.getByRole("status").textContent).toBe("Guardando…");
  });

  it("con asChild aplica el estilo a un enlace", () => {
    render(
      <Button asChild variant="outline" endIcon={<svg data-testid="icono" />}>
        <a href="/productos">Ver catálogo</a>
      </Button>,
    );
    const link = screen.getByRole("link", { name: "Ver catálogo" });
    expect(link.getAttribute("href")).toBe("/productos");
    expect(link.getAttribute("type")).toBeNull();
    expect(link.className).toContain("border-ink");
    expect(link.contains(screen.getByTestId("icono"))).toBe(true);
  });

  it("cargando no envía el formulario", () => {
    const onSubmit = vi.fn((event: Event) => event.preventDefault());
    render(
      <form onSubmit={(event) => onSubmit(event.nativeEvent)}>
        <Button type="submit" loading>
          Enviar
        </Button>
      </form>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Enviar" }));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("con asChild y cargando, el spinner y el ícono quedan dentro del enlace antes del texto", () => {
    render(
      <Button asChild loading endIcon={<svg data-testid="fin" />}>
        <a href="/productos">Ver catálogo</a>
      </Button>,
    );
    const link = screen.getByRole("link", { name: "Ver catálogo" });
    expect(link.getAttribute("aria-busy")).toBe("true");
    const [first, , last] = [...link.childNodes];
    expect((first as Element).classList.contains("spin")).toBe(true);
    expect(last).toBe(screen.getByTestId("fin"));
    expect(link.textContent).toBe("Ver catálogo");
  });

  it("un enlace deshabilitado sale del orden de tabulación", () => {
    render(
      <Button asChild disabled>
        <a href="/productos">Ver catálogo</a>
      </Button>,
    );
    const link = screen.getByRole("link", { name: "Ver catálogo" });
    expect(link.getAttribute("aria-disabled")).toBe("true");
    expect(link.getAttribute("tabindex")).toBe("-1");
  });

  it("muestra el ícono inicial y lo cambia por el spinner al cargar", () => {
    const { rerender } = render(<Button startIcon={<svg data-testid="icono" />}>Buscar</Button>);
    expect(screen.queryByTestId("icono")).not.toBeNull();
    rerender(
      <Button loading startIcon={<svg data-testid="icono" />}>
        Buscar
      </Button>,
    );
    expect(screen.queryByTestId("icono")).toBeNull();
    const spinner = screen.getByRole("button").querySelector("svg.spin");
    // En una caja del tamaño del ícono (20 px en md): el ancho no cambia.
    expect(spinner?.parentElement?.className).toContain("size-5");
  });
});

describe("variantes sin choques de clases", () => {
  // El botón no usa tailwind-merge (peso en el navegador): ninguna combinación puede traer dos
  // clases de la misma utilidad. Si tailwind-merge quitaría algo, hay un choque.
  const variants = [
    "primary",
    "accent",
    "dark",
    "outline",
    "ghost-light",
    "whatsapp",
    "danger",
    "link",
  ] as const;
  const sizes = ["sm", "md", "lg"] as const;
  const combos = variants.flatMap((variant) =>
    sizes.flatMap((size) => [true, false].map((block) => ({ variant, size, block }))),
  );

  it.each(combos)("$variant $size block=$block", (props) => {
    const classes = buttonVariants(props);
    expect(cn(classes).split(" ").sort()).toEqual(classes.split(" ").filter(Boolean).sort());
  });
});

/** Colores de src/styles/tokens.css: si cambia un token, la prueba usa el valor nuevo. */
function readTokens(): Record<string, string> {
  const css = readFileSync("src/styles/tokens.css", "utf8");
  return Object.fromEntries(
    [...css.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-f]{6})\b/gi)].map((m) => [m[1]!, m[2]!]),
  );
}

describe("contraste AA de las variantes (texto sobre fondo, mínimo 4.5:1)", () => {
  const t = readTokens();
  // [variante, texto, fondo]: estado normal y hover, y los fondos donde se usa cada una.
  const pairs: [string, string, string][] = [
    ["primary", "paper", "blue"],
    ["primary:hover", "paper", "blue-700"],
    ["accent", "ink", "yellow"],
    ["accent:hover", "ink", "yellow-600"],
    ["dark", "paper", "ink"],
    ["dark:hover", "paper", "navy"],
    ["outline", "ink", "paper"],
    ["outline:hover", "ink", "soft"],
    ["ghost-light sobre navy", "paper", "navy"],
    ["ghost-light sobre azul", "paper", "blue"],
    ["whatsapp", "paper", "whatsapp"],
    ["danger", "paper", "red"],
    ["danger:hover", "paper", "red-700"],
    ["whatsapp:hover", "paper", "whatsapp-700"],
    ["link sobre blanco", "blue", "paper"],
    ["link sobre soft", "blue", "soft"],
  ];

  it.each(pairs)("%s", (_name, text, background) => {
    expect(t[text], `token --${text}`).toBeDefined();
    expect(t[background], `token --${background}`).toBeDefined();
    expect(contrastRatio(t[text]!, t[background]!)).toBeGreaterThanOrEqual(4.5);
  });
});
