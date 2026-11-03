import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { feedback } from "@/content/feedback";
import { ErrorScreen, errorReference } from "./error-screen";

describe("ErrorScreen", () => {
  it("muestra el mensaje amable, el código de referencia y reintenta", () => {
    const retry = vi.fn();
    const error = Object.assign(new Error("detalle interno"), { digest: "123456789" });
    render(<ErrorScreen error={error} retry={retry} />);

    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      feedback.system.genericError.title,
    );
    expect(screen.getByText("Código de referencia: 123456789")).toBeTruthy();
    expect(screen.queryByText(/detalle interno/)).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: feedback.system.genericError.primary }));
    expect(retry).toHaveBeenCalledOnce();
  });

  it("lleva el foco al título para que el lector de pantalla lo anuncie", () => {
    render(<ErrorScreen error={{ digest: "1" }} retry={() => {}} />);
    expect(document.activeElement).toBe(screen.getByRole("heading", { level: 1 }));
  });

  it("sin digest (error del navegador) no muestra código", () => {
    render(<ErrorScreen error="algo" retry={() => {}} />);
    expect(screen.queryByText(/Código de referencia/)).toBeNull();
  });
});

describe("errorReference", () => {
  it("lee el digest solo si existe", () => {
    expect(errorReference({ digest: "abc" })).toBe("abc");
    expect(errorReference({ digest: "" })).toBeUndefined();
    expect(errorReference(new Error("x"))).toBeUndefined();
    expect(errorReference(null)).toBeUndefined();
  });
});
