#!/usr/bin/env bash
# SQL Server 2022 en contenedor para la CI (BD-014): mismo motor e intercalación que la base local
# (scripts/dev/sqlserver-local.ps1). Crea BolikDigital_Test y el login bolik_app (db_owner solo ahí;
# la app nunca usa sa). Las contraseñas se generan en cada corrida, se ocultan del log y solo viven
# en este runner: el repo no guarda ningún secreto. Exporta TEST_DATABASE_URL a $GITHUB_ENV.
set -euo pipefail

IMAGE="mcr.microsoft.com/mssql/server:2022-latest"
SA_PASSWORD="Sa1-$(openssl rand -hex 16)"
APP_PASSWORD="App1-$(openssl rand -hex 16)"
echo "::add-mask::${SA_PASSWORD}"
echo "::add-mask::${APP_PASSWORD}"

docker run -d --name mssql \
  -e ACCEPT_EULA=Y \
  -e MSSQL_PID=Express \
  -e MSSQL_COLLATION=Modern_Spanish_CI_AS \
  -e "MSSQL_SA_PASSWORD=${SA_PASSWORD}" \
  -p 127.0.0.1:1433:1433 \
  "${IMAGE}" >/dev/null

sql() {
  docker exec mssql /opt/mssql-tools18/bin/sqlcmd -C -b -S localhost -U sa -P "${SA_PASSWORD}" "$@"
}

for _ in $(seq 1 60); do
  if sql -Q "SELECT 1" >/dev/null 2>&1; then break; fi
  sleep 2
done
sql -Q "SELECT 1" >/dev/null # falla aquí (con el error de sqlcmd) si no arrancó en 2 min

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
