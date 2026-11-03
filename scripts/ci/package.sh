#!/usr/bin/env bash
# Arma el paquete del build (docs/15 §5) después de `pnpm build`: .next/standalone con los estáticos,
# public/ y las migraciones de prisma/. La CI instala con node-linker=hoisted antes del build: sin
# los enlaces de pnpm, el tar.gz se extrae y arranca igual en Linux y en Windows.
# Uso: scripts/ci/package.sh salida.tar.gz
set -euo pipefail

out="${1:?Uso: scripts/ci/package.sh salida.tar.gz}"
app=".next/standalone"
test -f "${app}/server.js" || { echo "No existe ${app}/server.js: corre pnpm build antes." >&2; exit 1; }

# Con la estructura de pnpm (node_modules/.pnpm + enlaces) el paquete no se puede extraer en Windows,
# y copiar los enlaces como archivos rompería la resolución de módulos: mejor fallar aquí.
if [ -d "${app}/node_modules/.pnpm" ]; then
  echo "El standalone usa la estructura de pnpm: instala con --config.node-linker=hoisted antes del build." >&2
  exit 1
fi

mkdir -p "${app}/.next"
cp -R .next/static "${app}/.next/static"
cp -R public "${app}/public"
cp -R prisma "${app}/prisma"
# -h copia como archivos los enlaces que quedan (los de Turbopack en .next/node_modules): con
# node_modules plano sus dependencias se resuelven igual desde la raíz del paquete.
tar -czhf "${out}" -C "${app}" .
echo "Paquete: ${out} ($(du -h "${out}" | cut -f1))"
