import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { QUOTE_STORAGE_KEY } from "@/features/quote/quote-count";
import { QuoteLink } from "./quote-link";

const stored = (lines: number) =>
  JSON.stringify({ state: { lines: Array.from({ length: lines }, () => ({})) }, version: 1 });

afterEach(() => localStorage.clear());

describe("QuoteLink (BD-041)", () => {
  it("muestra el número en el nombre accesible y en el globo", () => {
    localStorage.setItem(QUOTE_STORAGE_KEY, stored(3));
    render(<QuoteLink />);
    const link = screen.getByRole("link", { name: "Mi cotización, 3 productos" });
    expect(link.querySelector("[data-quote-count]")?.textContent).toBe("3");
  });

  it("sin líneas no hay globo; al subir desde otra pestaña, «pop» (A-05)", () => {
    render(<QuoteLink />);
    expect(screen.getByRole("link", { name: "Mi cotización" })).toBeTruthy();
    expect(document.querySelector("[data-quote-count]")).toBeNull();
    act(() => {
      localStorage.setItem(QUOTE_STORAGE_KEY, stored(1));
      window.dispatchEvent(new StorageEvent("storage", { key: QUOTE_STORAGE_KEY }));
    });
    const badge = document.querySelector("[data-quote-count]")!;
    expect(badge.textContent).toBe("1");
    // classList y no className: una clase pegada ("badge-poptnum") pasaría con toContain.
    expect(badge.classList.contains("badge-pop")).toBe(true);
    expect(badge.classList.contains("tnum")).toBe(true);
    expect(screen.getByRole("link", { name: "Mi cotización, 1 producto" })).toBeTruthy();
  });

  it("el número que ya estaba al cargar no se anima", () => {
    localStorage.setItem(QUOTE_STORAGE_KEY, stored(2));
    render(<QuoteLink />);
    expect(document.querySelector("[data-quote-count]")?.classList.contains("badge-pop")).toBe(
      false,
    );
  });
});
