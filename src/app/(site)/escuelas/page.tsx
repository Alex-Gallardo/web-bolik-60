import type { Route } from "next";
import Link from "next/link";
import { baloo } from "@/app/fonts";
import { FormNoScript } from "@/components/forms/form-noscript";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Section } from "@/components/layout/section";
import { CountUp } from "@/components/motion/count-up";
import { ActivityCards } from "@/components/schools/activity-cards";
import { KidsFigures, KidsScribble } from "@/components/schools/kids-decor";
import { SchoolFormLoader } from "@/components/schools/school-form-loader";
import { Accordion } from "@/components/ui/accordion";
import { buttonVariants } from "@/components/ui/button-variants";
import { breadcrumbsText } from "@/content/breadcrumbs";
import { schoolForm } from "@/content/forms";
import { schoolsPage } from "@/content/schools";
import { JsonLd, faqPageJsonLd } from "@/features/seo/jsonld";
import { buildMetadata } from "@/features/seo/metadata";
import { isSchoolStatKey } from "@/lib/constants";
import { whatsappMessage, whatsappUrl } from "@/lib/whatsapp";
import {
  getSiteSettings,
  listFaqs,
  listSchoolActivities,
  listSiteStats,
} from "@/server/data/content";
import { listDepartments } from "@/server/data/stores";

const PATH = "/escuelas";
/** Ancla del formulario: el botón del hero baja aquí. */
const FORM_ID = "solicitud";

export const metadata = buildMetadata({
  title: schoolsPage.metaTitle,
  description: schoolsPage.metaDescription,
  path: PATH,
});

/** Título de sección con Baloo 2 (la página la carga con baloo.variable). */
const kidsH2 = "font-kids text-[length:var(--fs-h2)] font-extrabold";

/**
 * Bolik en tu escuela (docs/06 §3.9, BD-105), en el orden del doc: estilo infantil, con Baloo 2 en
 * los títulos (la tercera familia, solo aquí; sin precarga) y la sub-paleta kids. Estática.
 *
 * 1. Hero amarillo: migas, h1, garabato que se dibuja al cargar (A-41, KidsScribble) y figuras que
 *    flotan desde lg (A-41, KidsFigures). 2. Cifras de escuelas, si Mercadeo publicó alguna
 *    (SCHOOL_STAT_KEYS, A-20). 3. Actividades (A-40), si hay publicadas. 4. La galería espera
 *    fotos con permiso. 5. Cómo funciona. 6. El formulario de BD-076 (diferido: SchoolFormLoader) con su aviso sin
 *    JavaScript.
 * 7. Las preguntas de escuelas (si hay) y el enlace a los kits cuando estén activos (BD-108).
 * JSON-LD: BreadcrumbList y, con preguntas, FAQPage.
 */
export default async function SchoolsPage() {
  const [departments, settings, activities, stats, faqs] = await Promise.all([
    listDepartments(),
    getSiteSettings(),
    listSchoolActivities(),
    listSiteStats(),
    listFaqs({ scope: "escuelas" }),
  ]);
  const whatsapp = settings.whatsappNumber
    ? whatsappUrl(settings.whatsappNumber, whatsappMessage({ context: "general" }))
    : null;
  const schoolStats = stats.filter((stat) => isSchoolStatKey(stat.key));
  // La última miga es la página actual, con el texto de su h1 (BD-093, seo.spec.ts).
  const crumbs = [breadcrumbsText.home, { name: schoolsPage.title, path: PATH }];

  return (
    <div className={`${baloo.variable} contents`}>
      <Section background="sun" spacing="sm" className="relative overflow-hidden">
        <KidsFigures />
        <div className="relative flex max-w-2xl flex-col gap-5">
          <Breadcrumbs crumbs={crumbs} />
          <h1 className="font-kids text-[length:var(--fs-h1)] leading-tight font-extrabold">
            {schoolsPage.title}
          </h1>
          <KidsScribble draw="load" className="-mt-3 h-4 w-56" />
          <p className="text-[length:var(--fs-lead)]">{schoolsPage.intro}</p>
          <p>
            <a href={`#${FORM_ID}`} className={buttonVariants({ variant: "dark", block: true })}>
              {schoolsPage.formCta}
            </a>
          </p>
        </div>
      </Section>

      {schoolStats.length > 0 ? (
        <Section spacing="sm" aria-labelledby="escuelas-cifras">
          <h2 id="escuelas-cifras" className="sr-only">
            {schoolsPage.statsTitle}
          </h2>
          <ul className="flex flex-wrap justify-center gap-y-8 text-center">
            {schoolStats.map((stat) => (
              <li key={stat.key} className="flex w-1/2 flex-col items-center gap-1 px-2 lg:w-1/3">
                <CountUp
                  value={stat.value}
                  prefix={stat.prefix ?? ""}
                  suffix={stat.suffix ?? ""}
                  className="font-kids text-[length:var(--fs-h1)] leading-none font-extrabold text-kblue"
                />
                <span>{stat.label}</span>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {activities.length > 0 ? (
        <Section background="soft" aria-labelledby="escuelas-actividades">
          <h2 id="escuelas-actividades" className={kidsH2}>
            {schoolsPage.activitiesTitle}
          </h2>
          <ActivityCards activities={activities} kidsFont className="mt-8" />
        </Section>
      ) : null}

      <Section aria-labelledby="escuelas-pasos">
        <h2 id="escuelas-pasos" className={kidsH2}>
          {schoolsPage.stepsTitle}
        </h2>
        <ol className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {schoolsPage.steps.map((step, index) => (
            <li key={step} className="flex items-center gap-4">
              <span
                aria-hidden="true"
                className="grid size-12 shrink-0 place-items-center rounded-full bg-sun font-kids text-2xl font-extrabold text-ink"
              >
                {index + 1}
              </span>
              <span className="text-lg font-bold text-heading">{step}</span>
            </li>
          ))}
        </ol>
      </Section>

      <Section background="soft" aria-labelledby="escuelas-formulario">
        <div id={FORM_ID} className="flex max-w-2xl scroll-mt-24 flex-col gap-4">
          <h2 id="escuelas-formulario" className={kidsH2}>
            {schoolForm.title}
          </h2>
          <FormNoScript whatsappUrl={whatsapp} whatsappNumber={settings.whatsappNumber} />
          {/* Diferido: se descarga al acercarse (school-form-loader.tsx, docs/12 §2). */}
          <SchoolFormLoader
            departments={departments.map(({ slug, name }) => ({ slug, name }))}
            whatsappUrl={whatsapp}
          />
        </div>
      </Section>

      {faqs.length > 0 ? (
        <Section aria-labelledby="escuelas-faq">
          <div className="max-w-[860px]">
            <h2 id="escuelas-faq" className={kidsH2}>
              {schoolsPage.faqTitle}
            </h2>
            <Accordion
              className="mt-8"
              exclusive="faq-escuelas"
              items={faqs.map((faq) => ({
                id: `faq-${faq.key}`,
                title: faq.question,
                content: <p>{faq.answer}</p>,
              }))}
            />
          </div>
          <JsonLd data={faqPageJsonLd(faqs)} />
        </Section>
      ) : null}

      {settings.kitsEnabled ? (
        <Section spacing="sm">
          <Link
            href={schoolsPage.kits.href as Route}
            className={buttonVariants({ variant: "link", block: true })}
          >
            {schoolsPage.kits.label}
          </Link>
        </Section>
      ) : null}
    </div>
  );
}
