import type { Metadata } from "next";
import { env } from "@/env";
import { getFeaturedProduct, listCategories, listProducts } from "@/server/data/catalog";
import {
  getSiteSettings,
  listFaqs,
  listHeroChapters,
  listMilestones,
  listSchoolActivities,
  listSiteStats,
} from "@/server/data/content";
import { listDepartments, listStores } from "@/server/data/stores";
import type { LineGroup } from "@/server/data/types";

/**
 * Vitrina interna de los datos (BD-037): lo que leen las páginas desde src/server/data, con la
 * fuente activa (DATA_SOURCE). Sirve para revisar los datos de ejemplo y comprueba que el build
 * prerenderiza las funciones con 'use cache'.
 */
export const metadata: Metadata = {
  title: "Datos · Styleguide",
  robots: { index: false, follow: false },
};

const mm = (value: number | null) => (value === null ? "—" : `${value} mm`);

const LINE_LABELS: Record<LineGroup, string> = {
  escritura: "Escritura",
  escolar: "Escolar",
  arte: "Arte",
  oficina: "Oficina",
};

export default async function DatosPage() {
  const [ultra, categories, products, departments, stores, chapters, stats, milestones] =
    await Promise.all([
      getFeaturedProduct(),
      listCategories(),
      listProducts(),
      listDepartments(),
      listStores(),
      listHeroChapters(),
      listSiteStats(),
      listMilestones(),
    ]);
  const [faqs, activities, settings] = await Promise.all([
    listFaqs({ scope: "home" }),
    listSchoolActivities(),
    getSiteSettings(),
  ]);
  const withStores = departments.filter((d) => d.storeCount > 0);
  const samples = products.filter((p) => p.sample).length;

  return (
    <div className="container-site flex flex-col gap-16 py-16">
      <header className="flex flex-col gap-2">
        <p className="eyebrow text-blue">Styleguide</p>
        <h1>Datos del sitio</h1>
        <p className="text-muted">
          Fuente activa: <strong>{env.DATA_SOURCE ?? "fixtures"}</strong>. {products.length}{" "}
          productos ({samples} de ejemplo), {categories.length} categorías, {stores.length} tiendas
          en {withStores.length} departamentos.
        </p>
      </header>

      {ultra && (
        <section className="flex flex-col gap-6" aria-labelledby="destacado">
          <h2 id="destacado">{ultra.name}</h2>
          <p>{ultra.shortDescription}</p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm [&_td]:py-1 [&_td]:pr-4 [&_th]:pr-4">
              <caption className="mb-2 text-left text-muted">Variantes</caption>
              <thead>
                <tr>
                  <th scope="col">Color</th>
                  <th scope="col">Código</th>
                  <th scope="col">Código de barras</th>
                </tr>
              </thead>
              <tbody>
                {ultra.variants.map((v) => (
                  <tr key={v.sku}>
                    <td>
                      <span
                        aria-hidden="true"
                        className="mr-2 inline-block size-3 rounded-full border border-line"
                        style={{ backgroundColor: v.color.hex }}
                      />
                      {v.color.name}
                    </td>
                    <td>{v.sku}</td>
                    <td>{v.barcode ?? "Por confirmar"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm [&_td]:py-1 [&_td]:pr-4 [&_th]:pr-4">
              <caption className="mb-2 text-left text-muted">Presentaciones</caption>
              <thead>
                <tr>
                  <th scope="col">Presentación</th>
                  <th scope="col">Unidades</th>
                  <th scope="col">Medidas</th>
                </tr>
              </thead>
              <tbody>
                {ultra.packagings.map((p) => (
                  <tr key={p.code}>
                    <td>{p.name}</td>
                    <td>{p.unitsPerPack}</td>
                    <td>
                      {[p.lengthMm, p.widthMm, p.heightMm].every((v) => v === null)
                        ? "—"
                        : [p.lengthMm, p.widthMm, p.heightMm].map(mm).join(" × ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="flex flex-col gap-6" aria-labelledby="categorias">
        <h2 id="categorias">Categorías</h2>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((c) => (
            <li key={c.slug} className="rounded-md border border-line p-4">
              <p className="font-semibold">{c.name}</p>
              <p className="text-sm text-muted">
                {c.productCount} {c.productCount === 1 ? "producto" : "productos"} · línea{" "}
                {LINE_LABELS[c.lineGroup]}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-6" aria-labelledby="productos">
        <h2 id="productos">Productos</h2>
        <ul className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <li key={p.slug}>
              {p.name} <span className="text-muted">· {p.skus.join(", ")}</span>
              {p.sample && <span className="text-muted"> · ejemplo</span>}
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-6" aria-labelledby="tiendas">
        <h2 id="tiendas">Tiendas por departamento</h2>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {withStores.map((d) => (
            <li key={d.slug}>
              <p className="font-semibold">
                {d.name} ({d.storeCount})
              </p>
              <p className="text-sm text-muted">
                {stores
                  .filter((s) => s.department.slug === d.slug)
                  .map((s) => s.name)
                  .join(", ")}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-6" aria-labelledby="contenido-home">
        <h2 id="contenido-home">Contenido de la home</h2>
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="flex flex-col gap-2">
            <h3>Capítulos del hero</h3>
            <ol className="list-decimal pl-5 text-sm">
              {chapters.map((c) => (
                <li key={c.key}>
                  <strong>{c.label}:</strong> {c.line} <em>({c.cta.label})</em>
                </li>
              ))}
            </ol>
          </div>
          <div className="flex flex-col gap-2">
            <h3>Cifras e historia publicadas</h3>
            <ul className="text-sm">
              {stats.map((s) => (
                <li key={s.key}>
                  {s.prefix}
                  {s.value}
                  {s.suffix} {s.label}
                </li>
              ))}
              {milestones.map((m) => (
                <li key={m.key}>
                  {m.year}: {m.title}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col gap-2">
            <h3>Preguntas frecuentes</h3>
            <ul className="text-sm">
              {faqs.map((f) => (
                <li key={f.key}>{f.question}</li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col gap-2">
            <h3>Actividades escolares</h3>
            <ul className="text-sm">
              {activities.map((a) => (
                <li key={a.key}>{a.title}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-2" aria-labelledby="ajustes">
        <h2 id="ajustes">Ajustes</h2>
        <p className="text-sm">
          {settings.legalName} · {settings.address} · {settings.phone} · {settings.businessHours}
        </p>
        <p className="text-sm text-muted">
          WhatsApp:{" "}
          {settings.whatsappNumber ?? "sin número (los botones de WhatsApp no se muestran)"}
        </p>
      </section>
    </div>
  );
}
