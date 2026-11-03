// Resumen de Lighthouse CI (BD-015) en Markdown, a partir de .lighthouseci/ (manifest.json y
// assertion-results.json). La CI lo publica en el resumen de la corrida y como comentario del PR;
// los reportes HTML completos quedan en el artefacto "lighthouse". Uso:
//   node scripts/ci/lhci-report.mjs [carpeta=.lighthouseci] > reporte.md
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const dir = process.argv[2] ?? ".lighthouseci";
const readJson = (file) => JSON.parse(readFileSync(file, "utf8"));
const MARKER = "<!-- lhci-report -->";

const runUrl =
  process.env.GITHUB_RUN_ID &&
  `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`;

const score = (value) => String(Math.round(value * 100));
const kb = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;
const seconds = (ms) => `${(ms / 1000).toFixed(2)} s`;
const millis = (ms) => `${Math.round(ms)} ms`;
const plain = (value) => String(Number(value.toFixed(3)));
/** "—" cuando Lighthouse no dio el valor (p. ej. una corrida con runtimeError). */
const show = (value, format) =>
  typeof value === "number" && !Number.isNaN(value) ? format(value) : "—";
const path = (url) => new URL(url).pathname;
const code = (text) => "`" + text + "`";

function summarize() {
  if (!existsSync(join(dir, "manifest.json"))) {
    return ["⚠️ No se generaron reportes: revisa el log del trabajo Lighthouse."];
  }
  const out = [
    "| Página | Rendimiento | Accesibilidad | Buenas prácticas | SEO | LCP | CLS | TBT | JS |",
    "|---|---|---|---|---|---|---|---|---|",
  ];
  const errors = [];

  // La corrida representativa (la mediana) de cada URL. Las aserciones usan la mejor de las 3.
  const runs = readJson(join(dir, "manifest.json")).filter((run) => run.isRepresentativeRun);
  for (const run of runs) {
    // jsonPath es absoluto en la máquina que corrió lhci; aquí basta el nombre del archivo.
    const lhr = readJson(join(dir, run.jsonPath.split(/[\\/]/).pop()));
    if (lhr.runtimeError) errors.push(`- ${code(path(run.url))}: ${lhr.runtimeError.message}`);
    const audit = (id) => lhr.audits?.[id]?.numericValue;
    const js = lhr.audits?.["resource-summary"]?.details?.items?.find(
      (item) => item.resourceType === "script",
    )?.transferSize;
    const s = run.summary ?? {};
    const cells = [
      code(path(run.url)),
      show(s.performance, score),
      show(s.accessibility, score),
      show(s["best-practices"], score),
      show(s.seo, score),
      show(audit("largest-contentful-paint"), seconds),
      show(audit("cumulative-layout-shift"), (v) => v.toFixed(3)),
      show(audit("total-blocking-time"), millis),
      show(js, kb),
    ];
    out.push(`| ${cells.join(" | ")} |`);
  }
  if (errors.length > 0) out.push("", "⚠️ **Lighthouse no pudo medir:**", "", ...errors);

  out.push("");
  const assertionsFile = join(dir, "assertion-results.json");
  if (!existsSync(assertionsFile)) {
    out.push("⚠️ Sin resultados de las aserciones: revisa el log del trabajo Lighthouse.");
    return out;
  }
  const failed = readJson(assertionsFile).filter((a) => !a.passed && a.level === "error");
  if (failed.length === 0) {
    out.push("✅ Todos los presupuestos se cumplen.");
    return out;
  }
  out.push("❌ **Presupuestos que no se cumplen:**", "");
  for (const a of failed) {
    // Tamaños en KB y puntajes de 0 a 100, como en la tabla.
    const format = a.auditProperty?.endsWith(".size")
      ? kb
      : a.auditId === "categories"
        ? score
        : plain;
    const what = a.auditProperty ? `${a.auditId}:${a.auditProperty}` : a.auditId;
    out.push(
      `- ${code(path(a.url))} · **${what}**: ${show(a.actual, format)} ` +
        `(límite ${a.operator} ${show(a.expected, format)})`,
    );
  }
  return out;
}

const lines = [MARKER, "## Lighthouse (móvil)", ""];
// Nunca termina en error ni deja el reporte vacío: si algo no se puede leer, el reporte lo dice
// (así el comentario del PR nunca se queda con un resultado verde anterior).
try {
  lines.push(...summarize());
} catch (error) {
  lines.push(`⚠️ No se pudo leer el resultado de Lighthouse (${error.message}): revisa el log.`);
}
lines.push(
  "",
  `Tabla: corrida mediana; los presupuestos se evalúan con la mejor de 3 (${code("lighthouse.config.cjs")}, docs/12).${
    runUrl ? ` Reportes HTML completos: artefacto **lighthouse** de [esta corrida](${runUrl}).` : ""
  }`,
);
console.log(lines.join("\n"));
