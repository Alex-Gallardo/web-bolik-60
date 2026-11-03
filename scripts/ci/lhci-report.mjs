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

const lines = [MARKER, "## Lighthouse (móvil)", ""];

if (!existsSync(join(dir, "manifest.json"))) {
  lines.push("No se generaron reportes: revisa el log del trabajo Lighthouse.");
} else {
  const score = (value) => (value == null ? "—" : String(Math.round(value * 100)));
  const kb = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;
  const path = (url) => new URL(url).pathname;

  // La corrida representativa (la mediana) de cada URL.
  const runs = readJson(join(dir, "manifest.json")).filter((run) => run.isRepresentativeRun);
  lines.push(
    "| Página | Rendimiento | Accesibilidad | Buenas prácticas | SEO | LCP | CLS | TBT | JS |",
    "|---|---|---|---|---|---|---|---|---|",
  );
  for (const run of runs) {
    // jsonPath es absoluto en la máquina que corrió lhci; aquí basta el nombre del archivo.
    const lhr = readJson(join(dir, run.jsonPath.split(/[\\/]/).pop()));
    const audit = (id) => lhr.audits[id]?.numericValue;
    const js = lhr.audits["resource-summary"]?.details?.items?.find(
      (item) => item.resourceType === "script",
    )?.transferSize;
    const s = run.summary;
    lines.push(
      `| \`${path(run.url)}\` | ${score(s.performance)} | ${score(s.accessibility)} | ` +
        `${score(s["best-practices"])} | ${score(s.seo)} | ${(audit("largest-contentful-paint") / 1000).toFixed(2)} s | ` +
        `${audit("cumulative-layout-shift").toFixed(3)} | ${Math.round(audit("total-blocking-time"))} ms | ` +
        `${js == null ? "—" : kb(js)} |`,
    );
  }

  const assertionsFile = join(dir, "assertion-results.json");
  const failed = existsSync(assertionsFile)
    ? readJson(assertionsFile).filter((a) => !a.passed && a.level === "error")
    : [];
  lines.push("");
  if (failed.length === 0) {
    lines.push("✅ Todos los presupuestos se cumplen.");
  } else {
    lines.push("❌ **Presupuestos que no se cumplen:**", "");
    for (const a of failed) {
      const isBytes = a.auditProperty?.endsWith(".size");
      const fmt = (v) => (isBytes ? kb(v) : Number(v.toFixed(3)));
      const what = a.auditProperty ? `${a.auditId}:${a.auditProperty}` : a.auditId;
      lines.push(
        `- \`${path(a.url)}\` · **${what}**: ${fmt(a.actual)} (límite ${a.operator} ${fmt(a.expected)})`,
      );
    }
  }
}

lines.push(
  "",
  `Presupuestos: \`lighthouse.config.cjs\` (docs/12).${
    runUrl ? ` Reportes HTML completos: artefacto **lighthouse** de [esta corrida](${runUrl}).` : ""
  }`,
);
console.log(lines.join("\n"));
