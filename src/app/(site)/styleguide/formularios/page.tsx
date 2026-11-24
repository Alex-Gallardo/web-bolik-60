import type { Metadata } from "next";
import { ContactForm } from "@/components/forms/contact-form";
import { DistributorForm } from "@/components/forms/distributor-form";
import { SchoolVisitForm } from "@/components/schools/school-visit-form";
import { distributorForm, schoolForm } from "@/content/forms";
import { whatsappMessage, whatsappUrl } from "@/lib/whatsapp";
import { getSiteSettings } from "@/server/data/content";
import { listDepartments } from "@/server/data/stores";

/**
 * Vitrina de los formularios de escuelas, distribuidores y contacto (BD-076) mientras no existen
 * sus páginas (BD-105, BD-106, BD-111): se envían de verdad (con DATA_SOURCE=fixtures, a memoria) y
 * los correos quedan en /styleguide/correos. Como todo /styleguide, en producción solo con sesión
 * de admin.
 */
export const metadata: Metadata = {
  title: "Formularios · Styleguide",
  robots: { index: false, follow: false },
};

export default async function FormulariosPage() {
  const [departments, settings] = await Promise.all([listDepartments(), getSiteSettings()]);
  const whatsapp = settings.whatsappNumber
    ? whatsappUrl(settings.whatsappNumber, whatsappMessage({ context: "general" }))
    : null;
  const options = departments.map(({ slug, name }) => ({ slug, name }));

  return (
    <div className="container-site flex flex-col gap-12 py-16">
      <header className="flex flex-col gap-2">
        <p className="eyebrow text-blue">Styleguide</p>
        <h1>Formularios de solicitudes</h1>
        <p className="max-w-3xl text-muted">
          Los formularios que montarán las páginas de escuelas, mayoreo y contacto. Cada envío se
          guarda (con su folio en escuelas y distribuidores), responde con su diálogo y deja sus
          correos en{" "}
          <a href="/styleguide/correos" className="underline">
            Correos (modo prueba)
          </a>
          .
        </p>
      </header>

      <section aria-labelledby="form-escuela" className="flex max-w-2xl flex-col gap-4">
        <h2 id="form-escuela">{schoolForm.title}</h2>
        <SchoolVisitForm departments={options} whatsappUrl={whatsapp} />
      </section>

      <section aria-labelledby="form-distribuidor" className="flex max-w-2xl flex-col gap-4">
        <h2 id="form-distribuidor">{distributorForm.title}</h2>
        <p className="text-muted">{distributorForm.intro}</p>
        <DistributorForm departments={options} whatsappUrl={whatsapp} />
      </section>

      <section aria-labelledby="form-contacto" className="flex max-w-2xl flex-col gap-4">
        <h2 id="form-contacto">Contacto</h2>
        <ContactForm whatsappUrl={whatsapp} />
      </section>
    </div>
  );
}
