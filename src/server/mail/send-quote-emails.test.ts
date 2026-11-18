import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// sendQuoteEmails (BD-074): a quién, qué marca y que nunca lanza, con el envío y los datos simulados.
const mocks = vi.hoisted(() => ({
  env: { SMTP_MODE: "smtp", MAIL_SALES_TO: "ventas@bolik66.com" },
  send: vi.fn(),
  settings: vi.fn(),
  mark: vi.fn(),
  countByEmail: vi.fn(),
  logError: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/env", () => ({ env: mocks.env }));
vi.mock("@/env.public", () => ({ publicEnv: { siteUrl: "https://www.bolik66.com/" } }));
vi.mock("@/server/data/content", () => ({ getSiteSettings: mocks.settings }));
vi.mock("@/server/data/quote-requests", () => ({
  markQuoteEmailSent: mocks.mark,
  countRecentQuotesByEmail: mocks.countByEmail,
}));
vi.mock("@/server/log", () => ({ log: { info: vi.fn() }, logError: mocks.logError }));
vi.mock("./transport", () => ({ sendMail: mocks.send }));

const { ACK_GUARD, adminQuoteUrl, sendQuoteEmails } = await import("./send-quote-emails");

const data = {
  quoteId: 9,
  folio: "COT-2027-000009",
  customerType: "empresa" as const,
  organization: "Empresa S.A.",
  name: "Luis Pérez",
  email: "luis@empresa.com",
  departmentName: "Guatemala",
  items: [
    {
      productName: "Bolik Ultra",
      colorName: "Azul",
      sku: "PT00058",
      packagingName: null,
      quantity: 3,
      unitLabel: "unidades",
    },
  ],
  createdAt: new Date("2027-01-12T15:30:00Z"),
};

const sentTo = () => mocks.send.mock.calls.map(([m]) => (m as { to: string }).to);

beforeEach(() => {
  mocks.env.SMTP_MODE = "smtp";
  mocks.send.mockResolvedValue(undefined);
  mocks.settings.mockResolvedValue({ quoteEmailTo: null, whatsappNumber: "55551234" });
  mocks.mark.mockResolvedValue(undefined);
  mocks.countByEmail.mockResolvedValue(1);
});
afterEach(() => vi.clearAllMocks());

describe("sendQuoteEmails (BD-074)", () => {
  it("manda el interno a MAIL_SALES_TO y el acuse al cliente; marca emailSentAt (SMTP real)", async () => {
    await sendQuoteEmails(data, true);
    expect(sentTo()).toEqual(["ventas@bolik66.com", "luis@empresa.com"]);
    expect(mocks.mark).toHaveBeenCalledWith(9);
    expect(mocks.send.mock.calls[0]![0].html).toContain(
      "https://www.bolik66.com/admin/cotizaciones/9",
    );
    expect(adminQuoteUrl(9)).toBe("https://www.bolik66.com/admin/cotizaciones/9");
  });

  it("el ajuste quote_email_to manda sobre MAIL_SALES_TO", async () => {
    mocks.settings.mockResolvedValue({ quoteEmailTo: "cotiza@bolik66.com", whatsappNumber: null });
    await sendQuoteEmails(data, true);
    expect(sentTo()[0]).toBe("cotiza@bolik66.com");
  });

  it("en modo prueba (file) o sin base no marca emailSentAt: nada salió de verdad", async () => {
    mocks.env.SMTP_MODE = "file";
    await sendQuoteEmails(data, true);
    mocks.env.SMTP_MODE = "smtp";
    await sendQuoteEmails(data, false);
    expect(mocks.mark).not.toHaveBeenCalled();
  });

  it("si el interno falla, el acuse sale igual y no se marca; nunca lanza", async () => {
    mocks.send.mockRejectedValueOnce(new Error("SMTP caído"));
    await expect(sendQuoteEmails(data, true)).resolves.toBeUndefined();
    expect(sentTo()).toEqual(["ventas@bolik66.com", "luis@empresa.com"]);
    expect(mocks.mark).not.toHaveBeenCalled();
    expect(mocks.logError).toHaveBeenCalledWith(expect.any(Error), {
      action: "sendQuoteEmails.sales",
      folio: data.folio,
    });
  });

  it("si falla marcar emailSentAt, se registra aparte y el acuse sale igual", async () => {
    mocks.mark.mockRejectedValue(new Error("base"));
    await sendQuoteEmails(data, true);
    expect(sentTo()).toHaveLength(2);
    expect(mocks.logError).toHaveBeenCalledWith(expect.any(Error), {
      action: "markQuoteEmailSent",
      folio: data.folio,
    });
  });

  it("sin ajustes, igual salen: a MAIL_SALES_TO y el acuse sin WhatsApp", async () => {
    mocks.settings.mockRejectedValue(new Error("sin base"));
    await sendQuoteEmails(data, true);
    expect(sentTo()).toEqual(["ventas@bolik66.com", "luis@empresa.com"]);
    expect(mocks.send.mock.calls[1]![0].text).not.toContain("WhatsApp");
  });

  it("sin correo del cliente, solo el interno", async () => {
    await sendQuoteEmails({ ...data, email: undefined }, true);
    expect(sentTo()).toEqual(["ventas@bolik66.com"]);
  });

  it("más de 2 cotizaciones a la misma dirección en 24 h: Ventas la recibe, el acuse no sale", async () => {
    mocks.countByEmail.mockResolvedValue(ACK_GUARD.maxPerEmail + 1);
    await sendQuoteEmails(data, true);
    expect(sentTo()).toEqual(["ventas@bolik66.com"]);
    const since = mocks.countByEmail.mock.calls[0]![1] as Date;
    expect(Date.now() - since.getTime()).toBeCloseTo(ACK_GUARD.windowMs, -3);
  });
});
