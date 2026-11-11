// Prueba local del build standalone tal como corre en el servidor (docs/15 §5):
// copia public/ y .next/static dentro de .next/standalone y arranca server.js.
// Requiere `pnpm build` antes. Puerto: PORT (por defecto 3000). Escucha solo en 127.0.0.1 salvo que
// HOSTNAME diga otra cosa (server.js usaría 0.0.0.0 y quedaría visible en la red local).
// En el servidor las variables las pone el servicio (NSSM); aquí se leen los .env* del proyecto
// (.env.local incluido), porque server.js solo busca .env dentro de .next/standalone.
import { cpSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import nextEnv from "@next/env";

const root = fileURLToPath(new URL("../", import.meta.url));
const standalone = `${root}.next/standalone`;

if (!existsSync(`${standalone}/server.js`)) {
  console.error("No existe .next/standalone/server.js. Corre `pnpm build` primero.");
  process.exit(1);
}

nextEnv.loadEnvConfig(root, false, { info: () => {}, error: console.error });
process.env.HOSTNAME ??= "127.0.0.1";
// Más abajo se cambia de carpeta a .next/standalone: un MEDIA_DIR relativo (./.media, el de
// desarrollo) se resuelve antes contra la raíz del proyecto. En el servidor ya es absoluto.
if (process.env.MEDIA_DIR && !isAbsolute(process.env.MEDIA_DIR)) {
  process.env.MEDIA_DIR = resolve(root, process.env.MEDIA_DIR);
}

// Pósters y videos de ejemplo del hero (BD-050): si faltan (no se corrió `pnpm media:samples`), se
// ponen reemplazos con la misma clave para que Playwright y Lighthouse no vean errores 404.
// Nunca pisa los archivos que ya están.
if (process.env.MEDIA_DIR) {
  const { ensureSampleMedia } = await import("./ci/sample-media.mjs");
  const written = await ensureSampleMedia(process.env.MEDIA_DIR);
  if (written) {
    console.log(
      `Medios de ejemplo: ${written} reemplazos en ${process.env.MEDIA_DIR} (las ilustraciones de la demo se ponen con pnpm media:samples).`,
    );
  }
}

cpSync(`${root}public`, `${standalone}/public`, { recursive: true });
cpSync(`${root}.next/static`, `${standalone}/.next/static`, { recursive: true });

// En el mismo proceso (sin hijo): al cerrarlo no queda ningún node.exe bloqueando .next/standalone.
process.chdir(standalone);
createRequire(import.meta.url)(`${standalone}/server.js`);
