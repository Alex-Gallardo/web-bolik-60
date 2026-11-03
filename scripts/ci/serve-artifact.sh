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
(cd "${dir}" && PORT=3100 HOSTNAME=127.0.0.1 nohup node server.js >"${log}" 2>&1 &)

for _ in $(seq 1 60); do
  if curl -fsS -o /dev/null http://127.0.0.1:3100/; then
    echo "El artefacto responde en http://127.0.0.1:3100"
    exit 0
  fi
  sleep 1
done
echo "El artefacto no respondió en 60 s:" >&2
cat "${log}" >&2
exit 1
