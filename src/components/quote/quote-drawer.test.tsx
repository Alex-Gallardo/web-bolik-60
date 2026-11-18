import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QUOTE_OPEN_EVENT, openQuoteDrawer } from "@/features/quote/storage-keys";
import { useQuote, type AddInput } from "@/features/quote/store";
import QuoteDrawer from "./quote-drawer";
import { QuoteLinkWithDrawer } from "@/components/layout/quote-link";

vi.mock("next/navigation", () => ({ usePathname: () => "/productos" }));

// El toast real (sonner) no hace falta: se mira qué se pidió y se pulsa su acción.
const toasts = vi.hoisted(() => [] as { title: string; id?: string; onAction?: () => void }[]);
vi.mock("@/components/feedback/feedback-store", async (original) => ({
  ...(await original<typeof import("@/components/feedback/feedback-store")>()),
  showToast: async (
    message: { title: string },
    options: { id?: string; onAction?: () => void },
  ) => {
    toasts.push({ title: message.title, ...options });
  },
}));

const line = (sku: string, color: string): AddInput => ({
  type: "variante",
  ref: sku,
  name: "Bolik Ultra",
  detail: `${color} · ${sku}`,
  packaging: "cajilla12",
  quantity: 2,
  url: "/productos/boligrafos/bolik-ultra",
});

const state = () => useQuote.getState();

function renderDrawer() {
  const onOpenChange = vi.fn();
  render(<QuoteDrawer open onOpenChange={onOpenChange} returnFocus={() => {}} />);
  return { onOpenChange };
}

/**
 * Empieza a quitar una línea: sale con A-36 (clase CSS) y se quita del store al terminar la
 * animación. jsdom no anima ni React recibe su animationend: la quita el respaldo de 400 ms.
 */
function startRemoving(name: RegExp) {
  const button = screen.getByRole("button", { name });
  fireEvent.click(button);
  expect(button.closest("li")!.classList.contains("quote-line-leave")).toBe(true);
  // Mientras sale, sigue en la lista.
  expect(state().lines).toHaveLength(3);
  return button;
}

async function removeLine(name: RegExp) {
  const button = startRemoving(name);
  await waitFor(() => expect(button.isConnected).toBe(false));
}

beforeEach(() => {
  state().add(line("PT00058", "Azul"));
  state().add(line("PT00059", "Negro"));
  state().add(line("PT00060", "Rojo"));
});

afterEach(() => {
  toasts.length = 0;
  state().clear();
  useQuote.setState({ lastCleared: undefined, lastRemoved: undefined });
  localStorage.clear();
});

describe("drawer de la cotización (BD-071)", () => {
  it("muestra cada línea con su detalle, presentación y cantidad", () => {
    renderDrawer();
    expect(screen.getByRole("dialog", { name: "Mi cotización" })).toBeTruthy();
    expect(screen.getByText("3 productos")).toBeTruthy();
    const list = screen.getByRole("list", { name: "Productos de tu cotización" });
    expect(list.querySelectorAll("li")).toHaveLength(3);
    expect(screen.getByText("Negro · PT00059")).toBeTruthy();
    expect(screen.getAllByText("cajilla de 12")).toHaveLength(3);
    expect(screen.getByRole("link", { name: "Enviar cotización" }).getAttribute("href")).toBe(
      "/cotizacion",
    );
  });

  it("cambiar la cantidad la guarda en el store, sin aviso", () => {
    renderDrawer();
    const input = screen.getByLabelText("Cantidad de Bolik Ultra", {
      selector: `[data-quote-line="variante:PT00059:cajilla12"] input`,
    });
    fireEvent.change(input, { target: { value: "35" } });
    expect(state().lines[1]!.quantity).toBe(35);
    expect(screen.queryByRole("button", { name: "Deshacer" })).toBeNull();
  });

  it("quitar saca la línea con «Deshacer» y deshacer la restaura en su lugar", async () => {
    renderDrawer();
    await removeLine(/Quitar Bolik Ultra Negro/);
    expect(state().lines.map((l) => l.ref)).toEqual(["PT00058", "PT00060"]);
    expect(screen.getByRole("status").textContent).toContain("Quitamos Bolik Ultra");
    // El foco pasa al «Quitar» que quedó en ese lugar.
    await waitFor(() =>
      expect(document.activeElement?.getAttribute("aria-label")).toMatch(/Quitar Bolik Ultra Rojo/),
    );

    fireEvent.click(screen.getByRole("button", { name: "Deshacer" }));
    expect(state().lines.map((l) => l.ref)).toEqual(["PT00058", "PT00059", "PT00060"]);
    expect(state().lines[1]!.quantity).toBe(2);
    expect(screen.queryByRole("button", { name: "Deshacer" })).toBeNull();
    await waitFor(() =>
      expect(document.activeElement?.getAttribute("aria-label")).toMatch(
        /Quitar Bolik Ultra Negro/,
      ),
    );
  });

  it("el aviso de «Deshacer» se va a los 6 s", () => {
    vi.useFakeTimers();
    try {
      renderDrawer();
      startRemoving(/Quitar Bolik Ultra Azul/);
      act(() => vi.advanceTimersByTime(400));
      expect(state().lines).toHaveLength(2);
      expect(screen.getByRole("button", { name: "Deshacer" })).toBeTruthy();
      act(() => vi.advanceTimersByTime(6000));
      expect(screen.queryByRole("button", { name: "Deshacer" })).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it("con el foco en «Deshacer» el aviso no se va; al salir, sí", () => {
    vi.useFakeTimers();
    try {
      renderDrawer();
      startRemoving(/Quitar Bolik Ultra Azul/);
      act(() => vi.advanceTimersByTime(400));
      const undo = screen.getByRole("button", { name: "Deshacer" });
      act(() => undo.focus());
      act(() => vi.advanceTimersByTime(10_000));
      expect(screen.getByRole("button", { name: "Deshacer" })).toBeTruthy();
      act(() => undo.blur());
      act(() => vi.advanceTimersByTime(6000));
      expect(screen.queryByRole("button", { name: "Deshacer" })).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it("cerrar con el aviso a la vista lo pasa a un toast que repone solo esa línea", async () => {
    const { onOpenChange } = renderDrawer();
    await removeLine(/Quitar Bolik Ultra Negro/);
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(toasts).toHaveLength(1);
    expect(toasts[0]).toMatchObject({ title: "Quitamos Bolik Ultra", id: "quote-removed" });
    // Si después se quitó otra línea, este toast ya no repone nada (no deshace la equivocada).
    state().remove("variante:PT00058:cajilla12");
    act(() => toasts[0]!.onAction!());
    expect(state().lines.map((l) => l.ref)).toEqual(["PT00060"]);
  });

  it("sin líneas muestra el estado vacío con el enlace al catálogo", () => {
    state().clear();
    renderDrawer();
    expect(screen.getByText("Tu cotización está vacía")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Ver el catálogo" }).getAttribute("href")).toBe(
      "/productos",
    );
    expect(screen.queryByRole("link", { name: "Enviar cotización" })).toBeNull();
  });
});

describe("anfitrión del drawer en el header (BD-071)", () => {
  it("no monta el drawer hasta que alguien lo abre", async () => {
    render(<QuoteLinkWithDrawer />);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(QUOTE_OPEN_EVENT).toBe("bolik:quote-open");
    act(() => openQuoteDrawer());
    expect(await screen.findByRole("dialog", { name: "Mi cotización" })).toBeTruthy();
  });
});
