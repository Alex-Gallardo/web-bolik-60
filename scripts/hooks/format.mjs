// Hook PostToolUse de Claude Code: formatea con Prettier el archivo que Claude acaba de editar.
// Recibe por stdin el JSON del evento (tool_input.file_path). Multiplataforma (no requiere jq).
// Usa el Prettier instalado en el proyecto (nunca descarga nada) y respeta .prettierignore.
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));
const prettier = fileURLToPath(
  new URL("../../node_modules/prettier/bin/prettier.cjs", import.meta.url),
);

let raw = "";
process.stdin.on("data", (c) => (raw += c));
process.stdin.on("end", () => {
  try {
    const file = JSON.parse(raw)?.tool_input?.file_path;
    if (!file || !/\.(tsx?|jsx?|mjs|css|json|md)$/.test(file)) return;
    if (file.replaceAll("\\", "/").includes("prisma/migrations") || !existsSync(prettier)) return;
    execFileSync(process.execPath, [prettier, "--write", "--log-level", "warn", file], {
      cwd: root,
      stdio: "inherit",
    });
  } catch {
    // Nunca bloquear a Claude por un fallo de formato.
  }
});
