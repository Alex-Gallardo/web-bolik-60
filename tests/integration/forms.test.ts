import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { parseSeedData } from "../../prisma/seed/data";
import { seedDatabase } from "../../prisma/seed/seed";
import { FOLIO_REGEX } from "@/lib/folio";
import { db } from "@/server/db";

// Formularios de escuelas, distribuidores y contacto (BD-076, docs/13 §4) contra BolikDigital_Test:
// cada solicitud queda en su tabla (las bandejas del admin las leen con BD-120), con folio ESC/DIS
// consecutivo, el límite de 5 por IP en 10 min y los correos en modo prueba.
const MARK = "Prueba BD-076";

const state = vi.hoisted(() => ({
  ip: "10.0.0.1",
  afterTasks: [] as (() => Promise<unknown>)[],
}));

vi.mock("@/env", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/env")>();
  return { env: { ...original.env, DATA_SOURCE: "db" } };
});
vi.mock("next/cache", () => ({ cacheLife: () => {}, cacheTag: () => {} }));
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-forwarded-for": state.ip }),
}));
vi.mock("next/server", () => ({
  after: (task: () => Promise<unknown>) => state.afterTasks.push(task),
}));

const MAIL_TMP = path.join(tmpdir(), `bolik-it-forms-${process.pid}`);
vi.mock("@/server/mail/transport", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/server/mail/transport")>();
  return {
    ...original,
    sendMail: (message: import("@/server/mail/transport").MailMessage) =>
      original.sendMail(message, { mode: "file", dir: MAIL_TMP }),
  };
});

const { submitSchoolVisit } = await import("@/features/schools/actions");
const { submitDistributor } = await import("@/features/distributors/actions");
const { submitContact } = await import("@/features/contact/actions");
const { formRateLimiter } = await import("@/server/rate-limit");
const { listStoredMails } = await import("@/server/mail/transport");

const meta = { website: "", elapsedMs: 10_000 };
const school = {
  schoolName: `${MARK} Colegio`,
  level: "primaria",
  students: "120",
  department: "quetzaltenango",
  municipality: "Quetzaltenango",
  name: "Ana López",
  phone: "5555 1234",
  email: "ana.bd076@ejemplo.com",
  preferredMonth: "febrero",
};
const distributor = {
  businessName: `${MARK} Librería`,
  businessType: "libreria",
  nit: "1234567-k",
  department: "guatemala",
  municipality: "Mixco",
  name: "Luis Pérez",
  phone: "",
  email: "luis.bd076@ejemplo.com",
};
const contact = {
  subject: "productos",
  name: `${MARK} Marta`,
  phone: "5555 9876",
  email: "",
  message: "¿Tienen lapiceros de tinta gel?",
};

let ipCounter = 0;
const newIp = () => {
  ipCounter += 1;
  state.ip = `10.76.0.${ipCounter}`;
};
const runAfter = async () => {
  for (const task of state.afterTasks) await task();
  state.afterTasks = [];
};

async function cleanup() {
  await db.schoolVisitRequest.deleteMany({ where: { schoolName: { startsWith: MARK } } });
  await db.distributorApplication.deleteMany({ where: { businessName: { startsWith: MARK } } });
  await db.contactMessage.deleteMany({ where: { name: { startsWith: MARK } } });
}

beforeAll(async () => {
  await seedDatabase(db, parseSeedData(), { profile: "dev" });
}, 180_000);
beforeEach(async () => {
  state.afterTasks = [];
  newIp();
  for (const form of ["school", "distributor", "contact"] as const) formRateLimiter(form).reset();
  await cleanup();
});
afterAll(async () => {
  await rm(MAIL_TMP, { recursive: true, force: true });
  await cleanup();
  await db.$disconnect();
});

describe("formularios de solicitudes contra SQL Server (BD-076)", () => {
  it("escuelas: SchoolVisitRequest con folio ESC, departamento y correos", async () => {
    const result = await submitSchoolVisit(school, meta);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.folio).toMatch(/^ESC-\d{4}-\d{6}$/);
    const row = await db.schoolVisitRequest.findUniqueOrThrow({
      where: { folio: result.data.folio },
      include: { department: true },
    });
    expect(row).toMatchObject({
      status: "nueva",
      level: "primaria",
      studentsApprox: 120,
      municipality: "Quetzaltenango",
      contactName: "Ana López",
      phone: "55551234",
      email: "ana.bd076@ejemplo.com",
      preferredMonth: "febrero",
    });
    expect(row.department?.slug).toBe("quetzaltenango");
    expect(row.ipHash).toHaveLength(64);

    await runAfter();
    const subjects = (await listStoredMails(10, MAIL_TMP)).map((m) => m.subject);
    expect(subjects).toContain(`Recibimos tu solicitud de visita ${result.data.folio}`);
    expect(
      subjects.some((s) => s.startsWith(`Nueva solicitud de visita ${result.data.folio}`)),
    ).toBe(true);
  });

  it("los folios ESC son consecutivos", async () => {
    const first = await submitSchoolVisit(school, meta);
    newIp();
    const second = await submitSchoolVisit(school, meta);
    if (!first.ok || !second.ok) throw new Error("no se guardaron");
    const n = (folio: string) => Number(folio.slice(-6));
    expect(n(second.data.folio)).toBe(n(first.data.folio) + 1);
  });

  it("distribuidores: DistributorApplication con folio DIS y NIT normalizado", async () => {
    const result = await submitDistributor(distributor, meta);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.folio).toMatch(FOLIO_REGEX);
    expect(result.data.folio.startsWith("DIS-")).toBe(true);
    const row = await db.distributorApplication.findUniqueOrThrow({
      where: { folio: result.data.folio },
    });
    expect(row).toMatchObject({
      businessType: "libreria",
      nit: "1234567K",
      branches: null,
      monthlyVolume: null,
      phone: null,
      status: "nueva",
    });
  });

  it("contacto: ContactMessage sin folio", async () => {
    expect(await submitContact(contact, meta)).toEqual({ ok: true, data: null });
    const row = await db.contactMessage.findFirstOrThrow({ where: { name: contact.name } });
    expect(row).toMatchObject({ subject: "productos", phone: "55559876", status: "nuevo" });
    await runAfter();
    const subjects = (await listStoredMails(10, MAIL_TMP)).map((m) => m.subject);
    expect(subjects).toContain("Nuevo mensaje de contacto · Información de productos");
  });

  it("campo trampa: éxito falso y nada en la base", async () => {
    const result = await submitSchoolVisit(school, { ...meta, website: "spam" });
    expect(result.ok).toBe(true);
    expect(await db.schoolVisitRequest.count({ where: { schoolName: school.schoolName } })).toBe(0);
  });

  it("el sexto envío de una IP en 10 min se rechaza, aunque se reinicie el límite en memoria", async () => {
    for (let i = 0; i < 5; i++) expect((await submitContact(contact, meta)).ok).toBe(true);
    formRateLimiter("contact").reset(); // como tras un reinicio del servidor
    expect(await submitContact(contact, meta)).toEqual({ ok: false, error: "rateLimited" });
    expect(await db.contactMessage.count({ where: { name: contact.name } })).toBe(5);
  });

  it("sin el límite en memoria, una ráfaga de 10 mensajes de contacto guarda solo 5 (bloqueo por IP)", async () => {
    const take = vi
      .spyOn(formRateLimiter("contact"), "take")
      .mockReturnValue({ ok: true, release: () => {} });
    try {
      const results = await Promise.all(
        Array.from({ length: 10 }, () => submitContact(contact, meta)),
      );
      expect(results.filter((r) => r.ok)).toHaveLength(5);
      expect(results.filter((r) => !r.ok && r.error === "rateLimited")).toHaveLength(5);
    } finally {
      take.mockRestore();
    }
    expect(await db.contactMessage.count({ where: { name: contact.name } })).toBe(5);
  });

  it("sin el límite en memoria, una ráfaga de 10 escuelas guarda solo 5 (la transacción cuenta)", async () => {
    const limiter = formRateLimiter("school");
    const take = vi.spyOn(limiter, "take").mockReturnValue({ ok: true, release: () => {} });
    try {
      const results = await Promise.all(
        Array.from({ length: 10 }, () => submitSchoolVisit(school, meta)),
      );
      expect(results.filter((r) => r.ok)).toHaveLength(5);
      expect(results.filter((r) => !r.ok && r.error === "rateLimited")).toHaveLength(5);
    } finally {
      take.mockRestore();
    }
    expect(await db.schoolVisitRequest.count({ where: { schoolName: school.schoolName } })).toBe(5);
  });
});
