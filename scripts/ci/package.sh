#!/usr/bin/env bash
# Arma el paquete del build (docs/15 §5) después de `pnpm build`: .next/standalone con los estáticos,
# public/ y las migraciones de prisma/. Se empaca con tar porque conserva los enlaces simbólicos
# que pnpm deja en node_modules (un zip los perdería). Uso: scripts/ci/package.sh salida.tar.gz
set -euo pipefail

out="${1:?Uso: scripts/ci/package.sh salida.tar.gz}"
app=".next/standalone"
test -f "${app}/server.js" || { echo "No existe ${app}/server.js: corre pnpm build antes." >&2; exit 1; }

mkdir -p "${app}/.next"
cp -R .next/static "${app}/.next/static"
cp -R public "${app}/public"
cp -R prisma "${app}/prisma"
tar -czf "${out}" -C "${app}" .
echo "Paquete: ${out} ($(du -h "${out}" | cut -f1))"
