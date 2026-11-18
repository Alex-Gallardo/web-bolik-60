import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/env", () => ({
  env: { SMTP_MODE: "file", MAIL_FROM: "Bolik <web@bolik66.com>", SMTP_PORT: 587 },
}));

const { listStoredMails, sendMail } = await import("./transport");

let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "bolik-mails-"));
});
afterEach(() => rm(dir, { recursive: true, force: true }));

const message = {
  to: "ventas@bolik66.com",
  subject: "Nueva cotización COT-2027-000001",
  html: "<p>Hola</p>",
  text: "Hola",
  replyTo: "ana@ejemplo.com",
};

describe("transporte de correo en modo prueba (BD-074)", () => {
  it("guarda el .eml (para Outlook) y el .json (bandeja de prueba); no sale nada a internet", async () => {
    await sendMail(message, { dir });
    const files = await readdir(dir);
    expect(files.filter((f) => f.endsWith(".eml"))).toHaveLength(1);
    const eml = await readFile(
      path.join(
        dir,
        files.find((f) => f.endsWith(".eml"))!,
      ),
      "utf8",
    );
    expect(eml).toContain("To: ventas@bolik66.com");
    expect(eml).toContain("From: Bolik <web@bolik66.com>");
    expect(eml).toContain("Reply-To: ana@ejemplo.com");

    const [stored] = await listStoredMails(20, dir);
    expect(stored).toMatchObject({ ...message, from: "Bolik <web@bolik66.com>" });
  });

  it("un salto de línea en el asunto no inyecta cabeceras", async () => {
    await sendMail({ ...message, subject: "Hola\r\nBcc: otro@malo.com" }, { dir });
    const [stored] = await listStoredMails(20, dir);
    expect(stored!.subject).toBe("Hola Bcc: otro@malo.com");
    const eml = await readFile(
      path.join(
        dir,
        (await readdir(dir)).find((f) => f.endsWith(".eml"))!,
      ),
      "utf8",
    );
    expect(eml).not.toMatch(/^Bcc:/m);
  });

  it("la bandeja muestra los más nuevos primero; sin carpeta, vacía", async () => {
    await sendMail({ ...message, subject: "Primero" }, { dir });
    await new Promise((r) => setTimeout(r, 5));
    await sendMail({ ...message, subject: "Segundo" }, { dir });
    expect((await listStoredMails(20, dir)).map((m) => m.subject)).toEqual(["Segundo", "Primero"]);
    expect(await listStoredMails(20, path.join(dir, "no-existe"))).toEqual([]);
  });
});
