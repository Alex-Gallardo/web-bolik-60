#!/usr/bin/env bash
# SQL Server 2022 en contenedor para la CI (BD-014): mismo motor e intercalación que la base local
# (scripts/dev/sqlserver-local.ps1). Crea BolikDigital_Test y el login bolik_app (db_owner solo ahí;
# la app nunca usa sa). Las contraseñas se generan en cada corrida, se ocultan del log y solo viven
# en este runner: el repo no guarda ningún secreto. Exporta TEST_DATABASE_URL a $GITHUB_ENV.
set -euo pipefail

# Fijada como las acciones del workflow; al subir de CU, cambiar aquí.
IMAGE="mcr.microsoft.com/mssql/server:2022-CU27-ubuntu-22.04"
SA_PASSWORD="Sa1-$(openssl rand -hex 16)"
APP_PASSWORD="App1-$(openssl rand -hex 16)"
echo "::add-mask::${SA_PASSWORD}"
echo "::add-mask::${APP_PASSWORD}"

# Si algo falla, el log del contenedor dice por qué (contraseña rechazada, memoria…).
trap 'docker logs mssql >&2 || true' ERR

docker run -d --name mssql \
  -e ACCEPT_EULA=Y \
  -e MSSQL_PID=Express \
  -e MSSQL_COLLATION=Modern_Spanish_CI_AS \
  -e "MSSQL_SA_PASSWORD=${SA_PASSWORD}" \
  -p 127.0.0.1:1433:1433 \
  "${IMAGE}" >/dev/null

# Falla con un mensaje claro y el log del contenedor (el trap ERR no cubre un exit explícito).
fail() {
  echo "::error::$1" >&2
  timeout 15 docker logs mssql >&2 || true
  exit 1
}

# Cada llamada lleva su propio límite (conexión de sqlcmd 5 s): un contenedor colgado no deja el
# script bloqueado hasta que GitHub cancela el trabajo. SQL_TIMEOUT: 15 s para cada intento de la
# espera; 180 s para el resto (crear la primera base en un SQL Server recién arrancado tarda más).
sql() {
  timeout "${SQL_TIMEOUT:-180}" docker exec mssql /opt/mssql-tools18/bin/sqlcmd -C -b -l 5 -S localhost -U sa -P "${SA_PASSWORD}" "$@"
}

# Espera con fecha límite real (SQLSERVER_WAIT_SECONDS, 120 por defecto) aunque los intentos tarden;
# si el contenedor se detiene, falla en el acto.
deadline=$((SECONDS + ${SQLSERVER_WAIT_SECONDS:-120}))
until SQL_TIMEOUT=15 sql -Q "SELECT 1" >/dev/null 2>&1; do
  running=$(timeout 15 docker inspect -f '{{.State.Running}}' mssql 2>/dev/null || echo false)
  [ "${running}" = "true" ] || fail "El contenedor de SQL Server se detuvo."
  [ "${SECONDS}" -lt "${deadline}" ] || fail "SQL Server no respondió a tiempo."
  sleep 2
done

sql -Q "
CREATE DATABASE BolikDigital_Test;
CREATE LOGIN bolik_app WITH PASSWORD = N'${APP_PASSWORD}', CHECK_POLICY = OFF;
" >/dev/null
sql -d BolikDigital_Test -Q "
CREATE USER bolik_app FOR LOGIN bolik_app;
ALTER ROLE db_owner ADD MEMBER bolik_app;
" >/dev/null

echo "SQL Server listo: $(sql -h -1 -W -Q "SET NOCOUNT ON; SELECT CONVERT(varchar(20), SERVERPROPERTY('ProductVersion')) + ' ' + CONVERT(varchar(40), SERVERPROPERTY('Collation'))")"
echo "TEST_DATABASE_URL=sqlserver://127.0.0.1:1433;database=BolikDigital_Test;user=bolik_app;password=${APP_PASSWORD};encrypt=true;trustServerCertificate=true" >>"${GITHUB_ENV}"
