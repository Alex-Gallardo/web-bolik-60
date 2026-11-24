import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Envío de los correos de BD-076: a qué bandeja, el tope de acuses y que nunca lance.
const mocks = vi.hoisted(() => ({
  env: {
    MAIL_SALES_TO: "ventas@bolik66.com",
    MAIL_SCHOOLS_TO: undefined as string | undefined,
    MAIL_DISTRIBUTORS_TO: undefined as string | undefined,
  },
  send: vi.fn(),
  settings: vi.fn(),
  countByEmail: vi.fn(),
  logError: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/env", () => ({ env: mocks.env }));
vi.mock("@/env.public", () => ({ publicEnv: { siteUrl: "https://www.bolik66.com/" } }));
vi.mock("@/server/data/content", () => ({ getSiteSettings: mocks.settings }));
vi.mock("@/server/data/form-requests", () => ({ countRecentRequestsByEmail: mocks.countByEmail }));
vi.mock("@/server/data/quote-requests", () => ({}));
vi.mock("@/server/log", () => ({ log: { info: vi.fn() }, logError: mocks.logError }));
vi.mock("./transport", () => ({ sendMail: mocks.send }));

const {
  adminRequestUrl,
  requestInbox,
  sendContactEmails,
  sendDistributorEmails,
  sendSchoolEmails,
} = await import("./send-request-emails");

const createdAt = new Date("2027-01-12T15:30:00Z");
const school = {
  id: 45,
  folio: "ESC-2027-000045",
  schoolName: "Colegio El Progreso",
  level: "primaria" as const,
  department: "quetzaltenango",
  departmentName: "Quetzaltenango",
  municipality: "Quetzaltenango",
  name: "Ana López",
  email: "ana@ejemplo.com",
  createdAt,
};
const sentTo = () => mocks.send.mock.calls.map(([m]) => (m as { to: string }).to);

beforeEach(() => {
  mocks.env.MAIL_SCHOOLS_TO = undefined;
  mocks.env.MAIL_DISTRIBUTORS_TO = undefined;
  mocks.send.mockResolvedValue(undefined);
  mocks.settings.mockResolvedValue({ whatsappNumber: "55551234" });
  mocks.countByEmail.mockResolvedValue(1);
});
afterEach(() => vi.clearAllMocks());

describe("sendSchoolEmails, sendDistributorEmails, sendContactEmails (BD-076)", () => {
  it("cada formulario a su bandeja; sin ella, a Ventas", () => {
    expect(requestInbox("school")).toBe("ventas@bolik66.com");
    mocks.env.MAIL_SCHOOLS_TO = "escuelas@bolik66.com";
    mocks.env.MAIL_DISTRIBUTORS_TO = "distribuidores@bolik66.com";
    expect(requestInbox("school")).toBe("escuelas@bolik66.com");
    expect(requestInbox("distributor")).toBe("distribuidores@bolik66.com");
    expect(requestInbox("contact")).toBe("ventas@bolik66.com");
    expect(adminRequestUrl("contact", 9)).toBe("https://www.bolik66.com/admin/mensajes/9");
  });

  it("escuelas: el interno a su bandeja y el acuse al visitante", async () => {
    mocks.env.MAIL_SCHOOLS_TO = "escuelas@bolik66.com";
    await sendSchoolEmails(school);
    expect(sentTo()).toEqual(["escuelas@bolik66.com", "ana@ejemplo.com"]);
    expect(mocks.countByEmail).toHaveBeenCalledWith("school", "ana@ejemplo.com", expect.any(Date));
  });

  it("sin correo del visitante, solo el interno", async () => {
    await sendDistributorEmails({
      ...school,
      folio: "DIS-2027-000012",
      businessName: "La Esquina",
      businessType: "libreria",
      email: undefined,
      phone: "55551234",
    });
    expect(sentTo()).toEqual(["ventas@bolik66.com"]);
  });

  it("más de 2 acuses a la misma dirección en 24 h: se omite el acuse, no el interno", async () => {
    mocks.countByEmail.mockResolvedValue(3);
    await sendSchoolEmails(school);
    expect(sentTo()).toEqual(["ventas@bolik66.com"]);
  });

  it("contacto: solo el interno, nunca acuse", async () => {
    await sendContactEmails({
      id: 9,
      subject: "otro",
      name: "Marta",
      email: "marta@ejemplo.com",
      message: "Hola",
      createdAt,
    });
    expect(sentTo()).toEqual(["ventas@bolik66.com"]);
    expect(mocks.settings).not.toHaveBeenCalled();
  });

  it("nunca lanza: un fallo del interno, de los ajustes o del acuse queda en el log", async () => {
    mocks.send.mockRejectedValue(new Error("SMTP caído"));
    mocks.settings.mockRejectedValue(new Error("sin base"));
    await expect(sendSchoolEmails(school)).resolves.toBeUndefined();
    expect(mocks.logError).toHaveBeenCalledTimes(3);
    // Sin ajustes el acuse se intentó igual (sin WhatsApp).
    expect(sentTo()).toEqual(["ventas@bolik66.com", "ana@ejemplo.com"]);
  });
});
