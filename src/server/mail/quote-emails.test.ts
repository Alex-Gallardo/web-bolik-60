import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { customerQuoteAck, escapeHtml, salesQuoteEmail } = await import("./quote-emails");
type Data = Parameters<typeof salesQuoteEmail>[0];

const data: Data = {
  quoteId: 42,
  folio: "COT-2027-000042",
  customerType: "libreria",
  organization: "Librería El Estudiante",
  name: "Ana López",
  phone: "55551234",
  email: "ana@ejemplo.com",
  departmentName: "Quetzaltenango",
  municipality: "Salcajá",
  notes: "Para enero",
  items: [
    {
      productName: "Bolik Ultra",
      colorName: "Azul",
      sku: "PT00058",
      packagingName: "Cajilla de 12",
      quantity: 1200,
      unitLabel: "cajillas de 12",
    },
  ],
  createdAt: new Date("2027-01-12T15:30:00Z"),
};
const ADMIN = "https://www.bolik66.com/admin/cotizaciones/42";
const sales = () => salesQuoteEmail(data, { to: "ventas@bolik66.com", adminUrl: ADMIN });
const ack = (overrides: Partial<Data> = {}, whatsappNumber: string | null = "55551234") =>
  customerQuoteAck({ ...data, ...overrides }, { whatsappNumber });

describe("correo interno a Ventas (BD-074, doc 17 §8)", () => {
  it("asunto con folio, tipo de cliente y departamento", () => {
    expect(sales().subject).toBe(
      "Nueva cotización COT-2027-000042 · Librería o tienda · Quetzaltenango",
    );
    expect(sales().to).toBe("ventas@bolik66.com");
  });

  it("incluye folio, cliente, líneas y enlace al admin (criterio), en HTML y en texto", () => {
    for (const body of [sales().html, sales().text]) {
      expect(body).toContain("COT-2027-000042");
      for (const v of ["Ana López", "Librería El Estudiante", "+502 5555 1234", "ana@ejemplo.com"])
        expect(body).toContain(v);
      for (const v of ["Quetzaltenango", "Salcajá", "Bolik Ultra", "Azul", "PT00058"])
        expect(body).toContain(v);
      expect(body).toContain("Cajilla de 12");
      expect(body).toContain("1,200");
      expect(body).toContain("Para enero");
      expect(body).toContain(ADMIN);
    }
    expect(sales().html).toContain(`href="${ADMIN}"`);
  });

  it("responder le escribe al cliente (si dejó correo)", () => {
    expect(sales().replyTo).toBe("ana@ejemplo.com");
    expect(
      salesQuoteEmail({ ...data, email: undefined }, { to: "v@b.com", adminUrl: ADMIN }).replyTo,
    ).toBeUndefined();
  });

  it("lo que escribió el visitante se escapa: nunca es HTML", () => {
    const evil = salesQuoteEmail(
      { ...data, name: "<script>alert(1)</script>", notes: '<img src=x onerror="x">' },
      { to: "v@b.com", adminUrl: ADMIN },
    );
    expect(evil.html).not.toContain("<script>");
    expect(evil.html).not.toContain("<img");
    expect(evil.html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(escapeHtml(`"'&`)).toBe("&quot;&#39;&amp;");
  });
});

describe("acuse al cliente (BD-074, doc 17 §8)", () => {
  it("asunto, saludo, folio, plazo, líneas y WhatsApp con el folio", () => {
    const mail = ack()!;
    expect(mail.subject).toBe("Recibimos tu cotización COT-2027-000042");
    expect(mail.to).toBe("ana@ejemplo.com");
    expect(mail.text).toContain("Hola, Ana López:");
    expect(mail.text).toContain("Un ejecutivo de ventas te contactará en un día hábil");
    expect(mail.text).toContain("PT00058");
    expect(mail.text).toContain("WhatsApp al +502 5555 1234 y menciona tu folio");
    expect(mail.html).toContain("<strong>COT-2027-000042</strong>");
  });

  it("no contiene datos internos (criterio): ni admin, ni origen, ni Ventas, ni notas internas", () => {
    const mail = ack()!;
    for (const body of [mail.html, mail.text]) {
      expect(body).not.toContain("/admin");
      expect(body).not.toContain("Abrir en el admin");
      expect(body).not.toContain("Origen");
      expect(body).not.toContain("ventas@bolik66.com");
      expect(body).not.toContain("Tipo de cliente");
    }
    expect(mail.replyTo).toBeUndefined();
  });

  it("sin correo no hay acuse; sin número de WhatsApp no lo promete", () => {
    expect(ack({ email: undefined })).toBeNull();
    const mail = ack({}, null)!;
    expect(mail.text).not.toContain("WhatsApp");
    expect(mail.html).not.toContain("WhatsApp");
  });

  it("un «nombre» con forma de enlace no va en el saludo (abuso del acuse)", () => {
    for (const name of ["Visita gana-ya.com", "http://x.io", "www.promo.net"])
      expect(ack({ name })!.text).toMatch(/^Hola:\n/);
    expect(ack({ name: "Ana María López" })!.text).toMatch(/^Hola, Ana María López:/);
  });

  it("escapa el nombre del cliente", () => {
    expect(ack({ name: "<b>Ana</b>" })!.html).toContain("Hola, &lt;b&gt;Ana&lt;/b&gt;:");
  });
});
