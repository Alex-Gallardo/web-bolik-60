import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { feedback } from "@/content/feedback";
import { ui } from "@/content/ui";
import { EmptyState } from "./empty-state";
import {
  closeDialog,
  getState,
  openDialog,
  resetFeedbackState,
  retryableImport,
  runPrimary,
  runSecondary,
  setConnection,
  showToast,
  takeReturnFocus,
  toastDuration,
} from "./feedback-store";
import FriendlyDialog from "./friendly-dialog";
import { InlineAlert } from "./inline-alert";
import Toaster from "./toaster";
import { useFeedback } from "./use-feedback";

beforeAll(() => {
  // jsdom no trae matchMedia (lo usa el Toaster para elegir la posición).
  window.matchMedia ??= ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
});
beforeEach(() => resetFeedbackState());
afterEach(() => vi.useRealTimers());

describe("almacén de feedback", () => {
  it("un solo diálogo a la vez: el nuevo reemplaza al anterior", () => {
    openDialog(feedback.quote.failed, { kind: "error" });
    openDialog(feedback.quote.sent("COT-2027-000123"), { kind: "success" });
    expect(getState().dialog?.title).toBe(feedback.quote.sent("x").title);
    expect(getState().dialogOpen).toBe(true);
  });

  it("al cerrar avisa a onClose y no repite el aviso", () => {
    const onClose = vi.fn();
    openDialog(feedback.forms.contactSent, { kind: "success", onClose });
    closeDialog();
    closeDialog();
    expect(onClose).toHaveBeenCalledOnce();
    expect(getState().dialogOpen).toBe(false);
  });

  it("acción principal asíncrona: ocupado mientras corre y luego cierra", async () => {
    let finish!: () => void;
    openDialog(feedback.quote.failed, {
      kind: "error",
      onPrimary: () => new Promise<void>((resolve) => (finish = resolve)),
    });
    const running = runPrimary();
    expect(getState().dialogBusy).toBe(true);
    // Ocupado: la secundaria no hace nada.
    runSecondary();
    expect(getState().dialogOpen).toBe(true);
    finish();
    await running;
    expect(getState()).toMatchObject({ dialogBusy: false, dialogOpen: false });
  });

  it("doble clic durante la salida: la acción corre una sola vez", async () => {
    const onPrimary = vi.fn();
    openDialog(feedback.admin.confirmDelete("x"), { kind: "confirm", onPrimary });
    await runPrimary();
    await runPrimary();
    runSecondary();
    expect(onPrimary).toHaveBeenCalledOnce();
  });

  it("si la acción falla, el diálogo queda abierto para reintentar", async () => {
    openDialog(feedback.quote.failed, {
      kind: "error",
      onPrimary: () => Promise.reject(new Error("sin red")),
    });
    await runPrimary();
    expect(getState()).toMatchObject({ dialogOpen: true, dialogBusy: false });
  });

  it("una descarga fallida se reintenta; una exitosa se recuerda", async () => {
    const load = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValue("ok");
    const once = retryableImport(load);
    await expect(once()).rejects.toThrow("offline");
    await expect(once()).resolves.toBe("ok");
    await expect(once()).resolves.toBe("ok");
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("si la acción abre otro diálogo, ese queda abierto", async () => {
    openDialog(feedback.quote.failed, {
      kind: "error",
      onPrimary: async () => {
        openDialog(feedback.quote.sent("COT-2027-000123"), { kind: "success" });
      },
    });
    await runPrimary();
    expect(getState().dialogOpen).toBe(true);
    expect(getState().dialog?.kind).toBe("success");
  });

  it("recuerda quién abrió el diálogo, aunque otro lo reemplace", () => {
    const button = document.createElement("button");
    document.body.append(button);
    button.focus();
    openDialog(feedback.quote.failed, { kind: "error" });
    document.body.focus();
    openDialog(feedback.quote.sent("x"), { kind: "success" });
    expect(takeReturnFocus()).toBe(button);
    // Se consume una vez.
    expect(takeReturnFocus()).toBeNull();
    button.remove();
  });

  it("duración: 4 s, 6 s con acción y la que se pida", () => {
    expect(toastDuration(feedback.catalog.pdfReady)).toBe(4000);
    expect(toastDuration(feedback.quote.removed("x"), { onAction: () => {} })).toBe(6000);
    // Con texto de acción pero sin onAction no hay botón: duración normal.
    expect(toastDuration(feedback.quote.removed("x"))).toBe(4000);
    expect(toastDuration(feedback.system.offline, { duration: Infinity })).toBe(Infinity);
  });

  it("el toast se anuncia: polite, y assertive si es error", async () => {
    await showToast(feedback.catalog.pdfReady);
    expect(getState().announcement).toMatchObject({
      text: feedback.catalog.pdfReady.title,
      politeness: "polite",
    });
    expect(getState().toastRequests).toBe(1);
    await showToast(feedback.admin.uploadTooBig);
    expect(getState().announcement).toMatchObject({
      text: `${feedback.admin.uploadTooBig.title}. ${feedback.admin.uploadTooBig.description}`,
      politeness: "assertive",
    });
  });

  it("conexión: sin red se anuncia; al volver, toast de éxito (una sola vez)", async () => {
    const messages = { offline: feedback.system.offline, online: feedback.system.online };
    setConnection(true, messages);
    expect(getState().announcement).toBeNull();
    setConnection(false, messages);
    setConnection(false, messages);
    expect(getState().offline).toBe(true);
    expect(getState().announcement).toMatchObject({ id: expect.any(Number), politeness: "polite" });
    expect(getState().announcement?.text).toContain(feedback.system.offline.title);
    setConnection(true, messages);
    expect(getState().offline).toBe(false);
    await waitFor(() => expect(getState().announcement?.text).toBe(feedback.system.online.title));
  });

  it("useFeedback expone la misma API estable", () => {
    let api: ReturnType<typeof useFeedback> | undefined;
    function Probe() {
      api = useFeedback();
      return null;
    }
    render(<Probe />);
    expect(Object.keys(api!)).toEqual(["toast", "dismissToast", "dialog", "closeDialog"]);
  });
});

describe("Toaster", () => {
  it("muestra el toast con su acción y silencia la región de sonner", async () => {
    const onAction = vi.fn();
    render(<Toaster />);
    await act(() => showToast(feedback.quote.removed("Bolik Ultra"), { onAction }));
    expect(await screen.findByText("Quitamos Bolik Ultra")).toBeTruthy();
    const region = screen.getByRole("region", { name: /^Avisos/ });
    expect(region.getAttribute("aria-live")).toBe("off");
    fireEvent.click(screen.getByRole("button", { name: "Deshacer" }));
    expect(onAction).toHaveBeenCalledOnce();
    expect(screen.getAllByRole("button", { name: ui.feedback.closeToast }).length).toBeGreaterThan(
      0,
    );
  });
});

describe("FriendlyDialog", () => {
  function renderDialog(busy = false) {
    openDialog(feedback.admin.confirmDelete("la tienda Tulán"), {
      kind: "confirm",
      destructive: true,
    });
    const request = getState().dialog!;
    return render(<FriendlyDialog request={request} open busy={busy} />);
  }

  it("título h2, texto, dos acciones y el foco empieza en «Cancelar» si es destructivo", async () => {
    renderDialog();
    const dialog = await screen.findByRole("dialog");
    expect(
      screen.getByRole("heading", { level: 2, name: "¿Eliminar la tienda Tulán?" }),
    ).toBeTruthy();
    expect(dialog.textContent).toContain("Esta acción no se puede deshacer.");
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByRole("button", { name: "Cancelar" })),
    );
    expect(screen.getByRole("button", { name: "Sí, eliminar" }).className).toContain("bg-red");
  });

  it("Escape cierra; ocupado, no", async () => {
    const view = renderDialog(true);
    fireEvent.keyDown(await screen.findByRole("dialog"), { key: "Escape" });
    expect(getState().dialogOpen).toBe(true);
    view.unmount();
    renderDialog(false);
    fireEvent.keyDown(await screen.findByRole("dialog"), { key: "Escape" });
    expect(getState().dialogOpen).toBe(false);
  });

  it("al reemplazarse, el diálogo nuevo toma el foco y se anuncia", async () => {
    openDialog(feedback.quote.failed, { kind: "error" });
    const view = render(<FriendlyDialog request={getState().dialog!} open busy={false} />);
    await screen.findByRole("dialog");
    openDialog(feedback.quote.sent("COT-2027-000123"), { kind: "success" });
    view.rerender(<FriendlyDialog request={getState().dialog!} open busy={false} />);
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByRole("button", { name: "Ver resumen" })),
    );
    expect(getState().announcement?.text).toContain(feedback.quote.sent("x").title);
  });

  it("sin texto de botón usa «Entendido»; con celebrate lleva confeti decorativo", async () => {
    openDialog({ title: "Hola", body: "Texto" }, { kind: "success", celebrate: true });
    render(<FriendlyDialog request={getState().dialog!} open busy={false} />);
    expect(await screen.findByRole("button", { name: ui.feedback.ok })).toBeTruthy();
    expect(document.querySelectorAll(".confetti-piece")).toHaveLength(12);
    expect(document.querySelector(".confetti")?.getAttribute("aria-hidden")).toBe("true");
  });
});

describe("estados inline", () => {
  it("EmptyState con título, texto y acción", () => {
    render(
      <EmptyState illustration="no-results" {...feedback.catalog.noResults("lapicero")}>
        <button type="button">Ver catálogo</button>
      </EmptyState>,
    );
    expect(
      screen.getByRole("heading", { level: 2, name: "No encontramos «lapicero»" }),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Ver catálogo" })).toBeTruthy();
  });

  it("InlineAlert lleva texto además del color", () => {
    render(<InlineAlert {...feedback.admin.altMissing} />);
    expect(screen.getByText(feedback.admin.altMissing.title)).toBeTruthy();
    expect(screen.getByText(feedback.admin.altMissing.description)).toBeTruthy();
  });
});
