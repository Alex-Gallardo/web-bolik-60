import { beforeEach, describe, expect, it, vi } from "vitest";

// Con DATA_SOURCE=fixtures (desarrollo y CI) las solicitudes de BD-076 se guardan en memoria con su
// propio consecutivo. Con SQL Server: tests/integration/forms.test.ts.
vi.mock("server-only", () => ({}));
vi.mock("@/env", () => ({ env: { DATA_SOURCE: "fixtures" } }));
vi.mock("@/server/log", () => ({ log: { info: vi.fn() } }));

const {
  RequestRateLimitError,
  countRecentRequestsByEmail,
  countRecentRequestsByIp,
  resetMemoryRequests,
  saveContactMessage,
  saveDistributorApplication,
  saveSchoolVisit,
} = await import("./form-requests");

const limit = { max: 2, windowMs: 10 * 60_000 };
const now = new Date("2027-02-01T15:00:00Z");
const school = {
  schoolName: "Colegio",
  level: "primaria" as const,
  department: "guatemala",
  municipality: "Mixco",
  name: "Ana",
  email: "Ana@Ejemplo.com",
};

beforeEach(() => resetMemoryRequests());

describe("solicitudes en memoria (BD-076)", () => {
  it("folios ESC y DIS consecutivos por año; contacto sin folio", async () => {
    expect(await saveSchoolVisit({ data: school, ipHash: "a" }, limit, now)).toEqual({
      id: 1,
      folio: "ESC-2027-000001",
      persisted: false,
    });
    expect((await saveSchoolVisit({ data: school, ipHash: "b" }, limit, now)).folio).toBe(
      "ESC-2027-000002",
    );
    const distributor = {
      businessName: "La Esquina",
      businessType: "libreria" as const,
      department: "guatemala",
      municipality: "Mixco",
      name: "Luis",
      phone: "55551234",
    };
    expect(
      (await saveDistributorApplication({ data: distributor, ipHash: "a" }, limit, now)).folio,
    ).toBe("DIS-2027-000001");
    const contact = { subject: "otro" as const, name: "Marta", phone: "55551234", message: "Hola" };
    expect(await saveContactMessage({ data: contact, ipHash: "a" }, limit, now)).toEqual({
      id: 1,
      folio: null,
      persisted: false,
    });
  });

  it("límite por IP dentro de la ventana, y cuentas por IP y por correo", async () => {
    await saveSchoolVisit({ data: school, ipHash: "a" }, limit, now);
    await saveSchoolVisit({ data: school, ipHash: "a" }, limit, now);
    await expect(saveSchoolVisit({ data: school, ipHash: "a" }, limit, now)).rejects.toBeInstanceOf(
      RequestRateLimitError,
    );
    const since = new Date(now.getTime() - 60_000);
    expect(await countRecentRequestsByIp("school", "a", since)).toBe(2);
    expect(await countRecentRequestsByIp("contact", "a", since)).toBe(0);
    expect(await countRecentRequestsByEmail("school", "ana@ejemplo.com", since)).toBe(2);
    // Pasada la ventana, vuelve a aceptar.
    const later = new Date(now.getTime() + limit.windowMs + 1);
    expect((await saveSchoolVisit({ data: school, ipHash: "a" }, limit, later)).folio).toBe(
      "ESC-2027-000003",
    );
  });
});
