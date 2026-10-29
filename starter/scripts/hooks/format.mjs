// Hook PostToolUse de Claude Code: formatea con Prettier el archivo que Claude acaba de editar.
// Recibe por stdin el JSON del evento (tool_input.file_path). Multiplataforma (no requiere jq).
import { execFileSync } from "node:child_process";

let raw = "";
process.stdin.on("data", (c) => (raw += c));
process.stdin.on("end", () => {
  try {
    const file = JSON.parse(raw)?.tool_input?.file_path;
    if (!file || !/\.(tsx?|jsx?|mjs|css|json|md)$/.test(file) || file.includes("prisma/migrations")) return;
    execFileSync(process.platform === "win32" ? "npx.cmd" : "npx", ["prettier", "--write", "--log-level", "warn", file], {
      stdio: "inherit",
      shell: process.platform === "win32",
    });
  } catch {
    // Nunca bloquear a Claude por un fallo de formato.
  }
});
