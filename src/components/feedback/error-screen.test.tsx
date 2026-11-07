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

describe("ErrorScreen: contacto (BD-046)", () => {
  function withPage(data: Record<string, string>) {
    const page = document.createElement("div");
    page.id = "pagina";
    Object.assign(page.dataset, data);
    document.body.append(page);
    return () => page.remove();
  }

  it("ofrece WhatsApp y teléfono con los datos que deja el layout", () => {
    const remove = withPage({
      contactPhone: "+502 6628 2600",
      contactTel: "tel:+50266282600",
      contactWhatsapp: "https://wa.me/50255550000",
    });
    render(<ErrorScreen error={null} retry={() => {}} />);
    const text = feedback.system.genericError;
    expect(screen.getByRole("link", { name: text.whatsapp }).getAttribute("href")).toBe(
      "https://wa.me/50255550000",
    );
    expect(
      screen.getByRole("link", { name: text.call("+502 6628 2600") }).getAttribute("href"),
    ).toBe("tel:+50266282600");
    remove();
  });

  it("sin número de WhatsApp (o con un enlace raro) no lo muestra", () => {
    const remove = withPage({
      contactPhone: "+502 6628 2600",
      contactTel: "tel:+50266282600",
      contactWhatsapp: "javascript:alert(1)",
    });
    render(<ErrorScreen error={null} retry={() => {}} />);
    expect(screen.queryByRole("link", { name: feedback.system.genericError.whatsapp })).toBeNull();
    expect(screen.getByRole("link", { name: /Llámanos/ })).toBeTruthy();
    remove();
  });

  it("sin layout (global-error) solo ofrece reintentar", () => {
    render(<ErrorScreen error={null} retry={() => {}} />);
    expect(screen.queryAllByRole("link")).toHaveLength(0);
    // Sin WhatsApp, el texto no lo promete.
    expect(screen.getByText(feedback.system.genericError.bodyNoWhatsapp)).toBeTruthy();
  });
});
