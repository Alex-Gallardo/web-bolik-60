import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { lineKey } from "@/features/quote/lines";
import { QUOTE_POP_EVENT, QUOTE_STORAGE_KEY } from "@/features/quote/storage-keys";
import { QuoteLink } from "./quote-link";

/** Lo que guarda el store de BD-070 (zustand persist) con n líneas. */
const stored = (lines: number) =>
  JSON.stringify({
    state: {
      lines: Array.from({ length: lines }, (_, i) => ({
        key: lineKey("variante", `PT0000${i}`, "cajilla12"),
        type: "variante",
        ref: `PT0000${i}`,
        packaging: "cajilla12",
        name: "Bolik Ultra",
        quantity: 1,
        url: "/productos/boligrafos/bolik-ultra",
        addedAt: 0,
      })),
    },
    version: 1,
  });

/** Lo guardado por el store, como al abrir la página (el contador no carga el store). */
const load = (lines: number) => localStorage.setItem(QUOTE_STORAGE_KEY, stored(lines));

afterEach(() => localStorage.clear());

describe("QuoteLink (BD-041)", () => {
  it("muestra el número en el nombre accesible y en el globo", () => {
    load(3);
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
      window.dispatchEvent(
        new StorageEvent("storage", { key: QUOTE_STORAGE_KEY, storageArea: localStorage }),
      );
    });
    const badge = document.querySelector("[data-quote-count]")!;
    expect(badge.textContent).toBe("1");
    // classList y no className: una clase pegada ("badge-poptnum") pasaría con toContain.
    expect(badge.classList.contains("badge-pop")).toBe(true);
    expect(badge.classList.contains("tnum")).toBe(true);
    expect(screen.getByRole("link", { name: "Mi cotización, 1 producto" })).toBeTruthy();
  });

  it("el número que ya estaba al cargar no se anima", () => {
    load(2);
    render(<QuoteLink />);
    expect(document.querySelector("[data-quote-count]")?.classList.contains("badge-pop")).toBe(
      false,
    );
  });

  it("«pop» también si se sumó a una línea que ya estaba (BD-062)", () => {
    load(1);
    render(<QuoteLink />);
    const badge = () => document.querySelector("[data-quote-count]")!;
    expect(badge().classList.contains("badge-pop")).toBe(false);
    act(() => {
      window.dispatchEvent(new Event(QUOTE_POP_EVENT));
    });
    expect(badge().textContent).toBe("1");
    expect(badge().classList.contains("badge-pop")).toBe(true);
  });
});
