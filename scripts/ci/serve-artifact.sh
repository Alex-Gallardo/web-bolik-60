#!/usr/bin/env bash
# Arranca el artefacto de la CI como en el servidor: lo extrae en una carpeta aparte y corre
# `node server.js` en 127.0.0.1:3100 (log en $RUNNER_TEMP/server.log). Espera a que responda.
# Uso: scripts/ci/serve-artifact.sh bolik-<sha>.tar.gz
set -euo pipefail

pkg="${1:?Uso: scripts/ci/serve-artifact.sh paquete.tar.gz}"
dir="${RUNNER_TEMP:-/tmp}/bolik-app"
log="${RUNNER_TEMP:-/tmp}/server.log"

rm -rf "${dir}" && mkdir -p "${dir}"
tar -xzf "${pkg}" -C "${dir}"
# Pósters y videos de ejemplo del hero (BD-050): no van al repo; reemplazos con la misma clave en el
# MEDIA_DIR del artefacto (./.media relativo a la carpeta donde corre server.js).
node scripts/ci/sample-media.mjs "${dir}/.media"
cd "${dir}"
PORT=3100 HOSTNAME=127.0.0.1 nohup node server.js >"${log}" 2>&1 &
pid=$!

for _ in $(seq 1 60); do
  if ! kill -0 "${pid}" 2>/dev/null; then
    echo "El servidor se detuvo al arrancar:" >&2
    cat "${log}" >&2
    exit 1
  fi
  # node y no curl: en la imagen de Playwright (job E2E) node está seguro; curl, no.
  if node -e "fetch('http://127.0.0.1:3100/',{signal:AbortSignal.timeout(5000)}).then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"; then
    echo "El artefacto responde en http://127.0.0.1:3100"
    exit 0
  fi
  sleep 1
done
echo "El artefacto no respondió en 60 s:" >&2
cat "${log}" >&2
exit 1
