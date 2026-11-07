#!/usr/bin/env bash
# Prueba de humo del build con DATA_SOURCE=db (BD-032), después de `pnpm build` contra la base de
# pruebas sembrada. Arranca el standalone apuntando a una base que NO existe: las páginas públicas
# deben responder igual, porque se prerenderizaron en el build y no consultan la base en cada
# petición (criterio de BD-032). Uso: scripts/ci/smoke-db-build.sh
set -euo pipefail

port=3300
log="${RUNNER_TEMP:-/tmp}/smoke-db.log"
base="http://127.0.0.1:${port}"

DATA_SOURCE=db \
DATABASE_URL="sqlserver://127.0.0.1:1;database=NoExiste;user=nadie;password=nada;encrypt=true;trustServerCertificate=true;connectTimeout=3000" \
PORT="${port}" HOSTNAME=127.0.0.1 \
  node scripts/start-local.mjs >"${log}" 2>&1 &
server=$!
trap 'kill "${server}" 2>/dev/null || true' EXIT

fail() {
  cat "${log}"
  echo "::error::$1"
  exit 1
}

ready=0
for _ in $(seq 1 60); do
  if curl -fs --max-time 5 -o /dev/null "${base}/"; then ready=1; break; fi
  kill -0 "${server}" 2>/dev/null || fail "El servidor se detuvo."
  sleep 1
done
[ "${ready}" = 1 ] || fail "El servidor no respondió en 60 s."

check() { # ruta, código esperado, texto que debe aparecer (dato que viene de la base)
  local body status
  body="$(mktemp)"
  status="$(curl -s --max-time 10 -o "${body}" -w '%{http_code}' "${base}$1" || true)"
  if [ "${status}" != "$2" ] || ! grep -q "$3" "${body}"; then
    fail "$1 respondió ${status} (esperado $2) o no contiene «$3»."
  fi
  echo "$1 → ${status}"
}

check / 200 "Industrias Bolik"
# El styleguide dice qué fuente usó el build y muestra códigos de barras de la base.
check /styleguide/datos 200 "Fuente activa: <strong>db</strong>"
check /styleguide/datos 200 "759364663115"
check /no-existe 404 'data-splash-enabled="true"'

# Una consulta en segundo plano que falle no da un 500, pero sí deja rastro en el log.
sleep 2
if grep -Eiq "ECONNREFUSED|ConnectionError|P1001|Failed to connect" "${log}"; then
  fail "El servidor intentó consultar la base."
fi
echo "El build con DATA_SOURCE=db sirve sus páginas sin consultar la base."
