import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { contactSalesEmail, distributorAck, distributorSalesEmail, schoolAck, schoolSalesEmail } =
  await import("./request-emails");

const createdAt = new Date("2027-01-12T15:30:00Z");
const school = {
  id: 45,
  folio: "ESC-2027-000045",
  schoolName: "Colegio <b>Mixto</b>",
  level: "primaria" as const,
  students: 1200,
  department: "quetzaltenango",
  departmentName: "Quetzaltenango",
  municipality: "Quetzaltenango",
  name: "Ana López",
  phone: "55551234",
  email: "ana@ejemplo.com",
  preferredMonth: "febrero" as const,
  createdAt,
};
const distributor = {
  id: 12,
  folio: "DIS-2027-000012",
  businessName: "Librería La Esquina",
  businessType: "tienda" as const,
  nit: "1234567K",
  department: "guatemala",
  departmentName: "Guatemala",
  municipality: "Mixco",
  name: "Luis Pérez",
  email: "luis@ejemplo.com",
  createdAt,
};
const admin = { to: "escuelas@bolik66.com", adminUrl: "https://www.bolik66.com/admin/escuelas/45" };

describe("correos de solicitudes (BD-076)", () => {
  it("escuelas, interno: asunto de doc 17, datos con sus etiquetas, todo escapado", () => {
    const mail = schoolSalesEmail(school, admin);
    expect(mail.subject).toBe(
      "Nueva solicitud de visita ESC-2027-000045 · Colegio <b>Mixto</b> · Quetzaltenango",
    );
    expect(mail.to).toBe("escuelas@bolik66.com");
    expect(mail.replyTo).toBe("ana@ejemplo.com");
    expect(mail.html).toContain("Colegio &lt;b&gt;Mixto&lt;/b&gt;");
    expect(mail.html).not.toContain("<b>Mixto");
    expect(mail.text).toContain("Nivel: Primaria");
    expect(mail.text).toContain("Alumnos aproximados: 1,200");
    expect(mail.text).toContain("Mes preferido: Febrero");
    expect(mail.text).toContain("Teléfono: +502 5555 1234");
    expect(mail.html).toContain(admin.adminUrl);
  });

  it("escuelas, acuse: folio, plazo de 3 días y WhatsApp; sin nada interno", () => {
    const ack = schoolAck(school, { whatsappNumber: "55550000" })!;
    expect(ack.to).toBe("ana@ejemplo.com");
    expect(ack.subject).toBe("Recibimos tu solicitud de visita ESC-2027-000045");
    expect(ack.text).toContain("Hola, Ana López:");
    expect(ack.text).toContain("3 días hábiles");
    expect(ack.text).toContain("5555 0000");
    expect(ack.html).toContain("<strong>ESC-2027-000045</strong>");
    expect(ack.html).not.toContain("/admin/");
  });

  it("acuse sin correo: null; un colegio o nombre con forma de enlace no se repite", () => {
    expect(schoolAck({ ...school, email: undefined }, { whatsappNumber: null })).toBeNull();
    const ack = schoolAck(
      { ...school, name: "visita spam.com", schoolName: "www.spam.com" },
      { whatsappNumber: null },
    )!;
    expect(ack.text).not.toContain("spam.com");
    expect(ack.text).toContain("para tu escuela");
    expect(ack.text).not.toContain("WhatsApp");
  });

  it("distribuidores: asunto con el tipo, NIT y acuse con 5 días hábiles", () => {
    const mail = distributorSalesEmail(distributor, {
      to: "ventas@bolik66.com",
      adminUrl: "https://www.bolik66.com/admin/distribuidores/12",
    });
    expect(mail.subject).toBe(
      "Nueva solicitud de distribuidor DIS-2027-000012 · Tienda · Guatemala",
    );
    expect(mail.text).toContain("NIT: 1234567K");
    expect(mail.text).toContain("Teléfono: —");
    const ack = distributorAck(distributor, { whatsappNumber: null })!;
    expect(ack.subject).toBe("Recibimos tu solicitud de distribuidor DIS-2027-000012");
    expect(ack.text).toContain("5 días hábiles");
  });

  it("contacto: asunto con el tema y el mensaje con sus saltos de línea", () => {
    const mail = contactSalesEmail(
      {
        id: 9,
        subject: "distribucion",
        name: "Marta",
        phone: "55551234",
        message: "Hola\n<script>x</script>",
        createdAt,
      },
      { to: "ventas@bolik66.com", adminUrl: "https://www.bolik66.com/admin/mensajes/9" },
    );
    expect(mail.subject).toBe("Nuevo mensaje de contacto · Distribución");
    expect(mail.replyTo).toBeUndefined();
    // Sin correo del visitante, el pie no promete que responder le llegue.
    expect(mail.text).not.toContain("Responder este correo");
    expect(mail.html).not.toContain("Responder este correo");
    expect(schoolSalesEmail(school, admin).html).toContain(
      "Responder este correo le escribe al cliente.",
    );
    expect(mail.html).toContain("Hola<br>&lt;script&gt;");
    expect(mail.text).toContain("Mensaje:\nHola\n<script>x</script>");
  });
});
