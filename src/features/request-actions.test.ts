import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { feedback } from "@/content/feedback";

// Las tres acciones de BD-076 con la capa de datos y los correos simulados: qué guardan, qué
// responden y que los correos vayan en after(). El camino común (trampa, límite) está en
// server/form-submit.test.ts; lo que toca SQL Server, en tests/integration/forms.test.ts.
const mocks = vi.hoisted(() => ({
  after: vi.fn(),
  departmentName: vi.fn(),
  saveSchool: vi.fn(),
  saveDistributor: vi.fn(),
  saveContact: vi.fn(),
  sendSchool: vi.fn(),
  sendDistributor: vi.fn(),
  sendContact: vi.fn(),
}));

vi.mock("next/server", () => ({ after: mocks.after }));
vi.mock("@/server/request-ip", () => ({ requestIpHash: async () => "b".repeat(64) }));
vi.mock("@/server/data/quote-requests", () => ({ departmentName: mocks.departmentName }));
vi.mock("@/server/data/form-requests", () => ({
  RequestRateLimitError: class RequestRateLimitError extends Error {},
  countRecentRequestsByIp: async () => 0,
  saveSchoolVisit: mocks.saveSchool,
  saveDistributorApplication: mocks.saveDistributor,
  saveContactMessage: mocks.saveContact,
}));
vi.mock("@/server/mail/send-request-emails", () => ({
  sendSchoolEmails: mocks.sendSchool,
  sendDistributorEmails: mocks.sendDistributor,
  sendContactEmails: mocks.sendContact,
}));
vi.mock("@/server/log", () => ({ log: { warn: vi.fn() }, logError: () => "REF12345" }));

const { submitSchoolVisit } = await import("@/features/schools/actions");
const { submitDistributor } = await import("@/features/distributors/actions");
const { submitContact } = await import("@/features/contact/actions");
const { formRateLimiter } = await import("@/server/rate-limit");
const { FOLIO_REGEX } = await import("@/lib/folio");

const meta = { website: "", elapsedMs: 12_000 };
const bot = { website: "http://spam", elapsedMs: 12_000 };
const school = {
  schoolName: "Colegio Mixto El Progreso",
  level: "primaria",
  students: "120",
  department: "quetzaltenango",
  municipality: "Quetzaltenango",
  name: "Ana López",
  phone: "5555 1234",
};
const distributor = {
  businessName: "Librería La Esquina",
  businessType: "tienda",
  nit: "CF",
  department: "guatemala",
  municipality: "Mixco",
  name: "Luis Pérez",
  email: "luis@ejemplo.com",
};
const contact = { subject: "otro", name: "Marta", email: "marta@ejemplo.com", message: "Hola" };

const runAfter = async () => {
  for (const [task] of mocks.after.mock.calls) await task();
};

beforeEach(() => {
  for (const form of ["school", "distributor", "contact"] as const) formRateLimiter(form).reset();
  mocks.departmentName.mockResolvedValue("Quetzaltenango");
  mocks.saveSchool.mockResolvedValue({ id: 4, folio: "ESC-2026-000004", persisted: true });
  mocks.saveDistributor.mockResolvedValue({ id: 2, folio: "DIS-2026-000002", persisted: true });
  mocks.saveContact.mockResolvedValue({ id: 9, folio: null, persisted: true });
});
afterEach(() => vi.clearAllMocks());

describe("submitSchoolVisit (BD-076)", () => {
  it("guarda con folio ESC y deja los correos para después", async () => {
    expect(await submitSchoolVisit(school, meta)).toEqual({
      ok: true,
      data: { folio: "ESC-2026-000004" },
    });
    expect(mocks.saveSchool).toHaveBeenCalledWith(
      {
        data: expect.objectContaining({ students: 120, phone: "55551234", level: "primaria" }),
        ipHash: "b".repeat(64),
      },
      { max: 5, windowMs: 600_000 },
    );
    expect(mocks.sendSchool).not.toHaveBeenCalled();
    await runAfter();
    expect(mocks.sendSchool).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 4,
        folio: "ESC-2026-000004",
        departmentName: "Quetzaltenango",
        schoolName: school.schoolName,
      }),
    );
  });

  it("un departamento que no existe: error en su campo, sin guardar", async () => {
    mocks.departmentName.mockResolvedValue(null);
    expect(await submitSchoolVisit(school, meta)).toEqual({
      ok: false,
      error: "invalid",
      fields: { department: feedback.forms.errors.required },
    });
    expect(mocks.saveSchool).not.toHaveBeenCalled();
  });

  it("campo trampa: éxito falso con un folio ESC creíble, sin guardar ni correos", async () => {
    const result = await submitSchoolVisit(school, bot);
    expect(result.ok && result.data.folio).toMatch(FOLIO_REGEX);
    expect(result.ok && result.data.folio.startsWith("ESC-")).toBe(true);
    expect(mocks.saveSchool).not.toHaveBeenCalled();
    expect(mocks.after).not.toHaveBeenCalled();
  });
});

describe("submitDistributor (BD-076)", () => {
  it("guarda con folio DIS y deja los correos para después", async () => {
    mocks.departmentName.mockResolvedValue("Guatemala");
    expect(await submitDistributor(distributor, meta)).toEqual({
      ok: true,
      data: { folio: "DIS-2026-000002" },
    });
    expect(mocks.saveDistributor.mock.calls[0]![0].data).toMatchObject({
      businessType: "tienda",
      nit: "CF",
    });
    await runAfter();
    expect(mocks.sendDistributor).toHaveBeenCalledWith(
      expect.objectContaining({ id: 2, folio: "DIS-2026-000002", departmentName: "Guatemala" }),
    );
  });

  it("un departamento que no existe: error en su campo", async () => {
    mocks.departmentName.mockResolvedValue(null);
    const result = await submitDistributor(distributor, meta);
    expect(result).toMatchObject({ ok: false, error: "invalid" });
    expect(mocks.saveDistributor).not.toHaveBeenCalled();
  });

  it("campo trampa: éxito falso con un folio DIS", async () => {
    const result = await submitDistributor(distributor, bot);
    expect(result.ok && result.data.folio.startsWith("DIS-")).toBe(true);
    expect(mocks.saveDistributor).not.toHaveBeenCalled();
  });
});

describe("submitContact (BD-076)", () => {
  it("guarda sin folio y manda el correo después", async () => {
    expect(await submitContact(contact, meta)).toEqual({ ok: true, data: null });
    await runAfter();
    expect(mocks.sendContact).toHaveBeenCalledWith(
      expect.objectContaining({ id: 9, subject: "otro", message: "Hola" }),
    );
  });

  it("campo trampa: éxito falso sin guardar", async () => {
    expect(await submitContact(contact, bot)).toEqual({ ok: true, data: null });
    expect(mocks.saveContact).not.toHaveBeenCalled();
  });

  it("datos inválidos: errores por campo", async () => {
    expect(await submitContact({}, meta)).toMatchObject({
      ok: false,
      error: "invalid",
      fields: { subject: feedback.forms.errors.required },
    });
  });
});
