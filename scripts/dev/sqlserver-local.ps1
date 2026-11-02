#Requires -RunAsAdministrator
<#
.SYNOPSIS
  Base de datos local de desarrollo de Bolik Digital (BD-017): SQL Server 2022 Express.

.DESCRIPTION
  Se corre UNA vez, como administrador, en la máquina de desarrollo. Es idempotente: si algo ya
  existe, lo deja igual (y renueva la contraseña de la app para escribirla de nuevo en .env.local).

  1. Descarga e instala SQL Server 2022 Express (solo el motor) desde el sitio de Microsoft,
     en silencio. Al hacerlo ACEPTAS la licencia de Microsoft SQL Server Express.
  2. Activa la autenticación mixta y TCP en el puerto 1433 (Prisma no usa named pipes).
     No se abre el firewall: solo esta máquina puede conectarse.
  3. Crea BolikDigital_Dev, BolikDigital_Shadow (base temporal de prisma migrate) y
     BolikDigital_Test, y el login bolik_app con db_owner en las tres. Desactiva sa.
  4. Escribe DATABASE_URL, SHADOW_DATABASE_URL y TEST_DATABASE_URL en .env.local (nunca se sube
     a git). La contraseña se genera aquí y no se muestra en pantalla.

.EXAMPLE
  # PowerShell como administrador, desde la raíz del repo:
  powershell -ExecutionPolicy Bypass -File scripts\dev\sqlserver-local.ps1
#>
[CmdletBinding()]
param(
  [string]$InstanceName = "SQLEXPRESS",
  [int]$Port = 1433,
  [string]$AppLogin = "bolik_app",
  [string[]]$Databases = @("BolikDigital_Dev", "BolikDigital_Shadow", "BolikDigital_Test")
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$EnvLocal = Join-Path $RepoRoot ".env.local"
$EnvExample = Join-Path $RepoRoot ".env.example"
$Work = Join-Path $env:TEMP "bolik-sqlserver"
# Mismo instalador que el paquete oficial de winget Microsoft.SQLServer.2022.Express.
$SseiUrl = "https://download.microsoft.com/download/29654887-7cde-4397-bba3-d7f087970845/SQL2022-SSEI-Expr.exe"
$ServiceName = "MSSQL`$$InstanceName"
$SqlRegistry = "HKLM:\SOFTWARE\Microsoft\Microsoft SQL Server"

function Write-Step([string]$Text) { Write-Host "`n==> $Text" -ForegroundColor Cyan }

# Contraseña aleatoria solo con letras y números (segura en cadenas de conexión y en .env, donde
# ";", "{" o "$" causarían problemas). Cumple la política de SQL Server: mayúscula, minúscula y número.
function New-Password([int]$Length = 32) {
  $chars = [char[]]"ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789"
  $rng = [Security.Cryptography.RandomNumberGenerator]::Create()
  do {
    $bytes = New-Object byte[] $Length
    $rng.GetBytes($bytes)
    $password = -join ($bytes | ForEach-Object { $chars[$_ % $chars.Length] })
  } until ($password -cmatch "[A-Z]" -and $password -cmatch "[a-z]" -and $password -match "[0-9]")
  return $password
}

# Solo archivos firmados por Microsoft: evita ejecutar un instalador alterado.
function Assert-MicrosoftSignature([string]$Path) {
  $signature = Get-AuthenticodeSignature $Path
  if ($signature.Status -ne "Valid" -or $signature.SignerCertificate.Subject -notmatch "O=Microsoft Corporation") {
    throw "La firma de $Path no es una firma válida de Microsoft ($($signature.Status)). Se cancela."
  }
}

function Invoke-Sql([string]$ConnectionString, [string]$Sql) {
  $connection = New-Object System.Data.SqlClient.SqlConnection $ConnectionString
  try {
    $connection.Open()
    $command = $connection.CreateCommand()
    $command.CommandText = $Sql
    $command.CommandTimeout = 120
    return $command.ExecuteScalar()
  } finally {
    $connection.Dispose()
  }
}

# Windows Authentication (memoria compartida): no necesita TCP ni contraseña.
$AdminConnection = "Server=localhost\$InstanceName;Database=master;Integrated Security=True;TrustServerCertificate=True"

# ── 1. Instalación ────────────────────────────────────────────────────────────────────────────
Write-Step "1/5 SQL Server 2022 Express ($InstanceName)"
if (Get-Service $ServiceName -ErrorAction SilentlyContinue) {
  Write-Host "Ya está instalado: se omite la instalación."
} else {
  $freeGb = [math]::Round((Get-PSDrive C).Free / 1GB, 1)
  if ($freeGb -lt 6) { throw "Se necesitan al menos 6 GB libres en C: (hay $freeGb GB)." }

  New-Item -ItemType Directory -Force $Work | Out-Null
  $ssei = Join-Path $Work "SQL2022-SSEI-Expr.exe"
  Write-Host "Descargando el instalador de Microsoft..."
  Invoke-WebRequest $SseiUrl -OutFile $ssei -UseBasicParsing
  Assert-MicrosoftSignature $ssei

  Write-Host "Descargando SQL Server Express Core (unos 260 MB)..."
  $download = Start-Process $ssei -ArgumentList "/ACTION=Download", "MEDIAPATH=$Work", "/MEDIATYPE=Core", "/QUIET" -Wait -PassThru
  $package = Get-ChildItem $Work -Recurse -Filter "SQLEXPR*_x64_ENU.exe" | Select-Object -First 1
  if (-not $package) { throw "No se descargó el paquete (código $($download.ExitCode))." }
  Assert-MicrosoftSignature $package.FullName

  Write-Host "Extrayendo..."
  $extract = Join-Path $Work "media"
  Start-Process $package.FullName -ArgumentList "/q", "/x:$extract" -Wait | Out-Null
  $setup = Join-Path $extract "SETUP.EXE"
  if (-not (Test-Path $setup)) { throw "No se encontró SETUP.EXE en $extract." }

  Write-Host "Instalando (5 a 10 minutos)..."
  $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent().Name
  # La contraseña de sa se descarta: sa queda desactivado en el paso 3.
  $saPassword = New-Password
  $arguments = @(
    "/Q", "/ACTION=Install", "/IACCEPTSQLSERVERLICENSETERMS", "/ENU", "/UPDATEENABLED=False",
    "/FEATURES=SQLENGINE", "/INSTANCENAME=$InstanceName", "/INSTANCEID=$InstanceName",
    "/SQLSVCACCOUNT=`"NT Service\MSSQL`$$InstanceName`"", "/SQLSVCSTARTUPTYPE=Automatic",
    "/SQLSYSADMINACCOUNTS=`"$currentUser`"", "/SECURITYMODE=SQL", "/SAPWD=`"$saPassword`"",
    "/TCPENABLED=1", "/NPENABLED=0", "/BROWSERSVCSTARTUPTYPE=Disabled"
  )
  $install = Start-Process $setup -ArgumentList $arguments -Wait -PassThru
  if ($install.ExitCode -ne 0 -and $install.ExitCode -ne 3010) {
    throw "La instalación falló (código $($install.ExitCode)). Revisa C:\Program Files\Microsoft SQL Server\160\Setup Bootstrap\Log\Summary.txt"
  }
  if ($install.ExitCode -eq 3010) { Write-Warning "Windows pide reiniciar; puedes hacerlo al terminar." }
  Remove-Item $Work -Recurse -Force -ErrorAction SilentlyContinue  # libera ~1 GB del instalador
}

# ── 2. Autenticación mixta y puerto fijo ──────────────────────────────────────────────────────
Write-Step "2/5 Autenticación mixta y TCP en el puerto $Port"
$instanceId = (Get-ItemProperty "$SqlRegistry\Instance Names\SQL").$InstanceName
$serverKey = "$SqlRegistry\$instanceId\MSSQLServer"
$tcpKey = "$serverKey\SuperSocketNetLib\Tcp"

$busy = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
  Where-Object { (Get-Process -Id $_.OwningProcess).ProcessName -ne "sqlservr" }
if ($busy) { throw "El puerto $Port lo usa otro programa ($((Get-Process -Id $busy[0].OwningProcess).ProcessName))." }

Set-ItemProperty $serverKey -Name LoginMode -Value 2           # Windows + SQL Server
Set-ItemProperty $tcpKey -Name Enabled -Value 1
Set-ItemProperty "$tcpKey\IPAll" -Name TcpPort -Value "$Port"
Set-ItemProperty "$tcpKey\IPAll" -Name TcpDynamicPorts -Value ""
Restart-Service $ServiceName -Force
Write-Host "Servicio $ServiceName reiniciado."

# ── 3. Bases, login de la app y sa ────────────────────────────────────────────────────────────
Write-Step "3/5 Bases de datos y login $AppLogin"
$appPassword = New-Password
foreach ($database in $Databases) {
  Invoke-Sql $AdminConnection "IF DB_ID(N'$database') IS NULL CREATE DATABASE [$database];" | Out-Null
  Write-Host "Base $database lista."
}
Invoke-Sql $AdminConnection @"
IF SUSER_ID(N'$AppLogin') IS NULL
  CREATE LOGIN [$AppLogin] WITH PASSWORD = N'$appPassword', CHECK_POLICY = ON, DEFAULT_DATABASE = [$($Databases[0])];
ELSE
  ALTER LOGIN [$AppLogin] WITH PASSWORD = N'$appPassword';
"@ | Out-Null
foreach ($database in $Databases) {
  Invoke-Sql $AdminConnection @"
USE [$database];
IF USER_ID(N'$AppLogin') IS NULL CREATE USER [$AppLogin] FOR LOGIN [$AppLogin];
ALTER ROLE db_owner ADD MEMBER [$AppLogin];
"@ | Out-Null
}
Invoke-Sql $AdminConnection "ALTER LOGIN [sa] DISABLE;" | Out-Null
Write-Host "Login $AppLogin con db_owner en las tres bases; sa desactivado."

# ── 4. .env.local ─────────────────────────────────────────────────────────────────────────────
Write-Step "4/5 .env.local"
if (-not (Test-Path $EnvLocal) -or (Get-Item $EnvLocal).Length -eq 0) {
  Copy-Item $EnvExample $EnvLocal -Force
  Write-Host "Se creó .env.local a partir de .env.example."
}
function Get-Url([string]$Database) {
  "`"sqlserver://localhost:$Port;database=$Database;user=$AppLogin;password=$appPassword;encrypt=true;trustServerCertificate=true`""
}
$values = [ordered]@{
  DATABASE_URL        = Get-Url $Databases[0]
  SHADOW_DATABASE_URL = Get-Url $Databases[1]
  TEST_DATABASE_URL   = Get-Url $Databases[2]
}
$lines = [System.Collections.Generic.List[string]]([IO.File]::ReadAllLines($EnvLocal))
foreach ($name in $values.Keys) {
  $line = "$name=$($values[$name])"
  $index = -1
  for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match "^\s*$name\s*=") { $index = $i; break }
  }
  if ($index -ge 0) { $lines[$index] = $line } else { $lines.Add($line) }
}
# UTF-8 sin BOM: así lo lee Next (@next/env).
[IO.File]::WriteAllLines($EnvLocal, $lines, (New-Object Text.UTF8Encoding $false))
Write-Host "DATABASE_URL, SHADOW_DATABASE_URL y TEST_DATABASE_URL escritas (la contraseña no se muestra)."

# ── 5. Verificación ───────────────────────────────────────────────────────────────────────────
Write-Step "5/5 Verificación por TCP con $AppLogin"
foreach ($database in $Databases) {
  $connection = "Server=tcp:127.0.0.1,$Port;Database=$database;User ID=$AppLogin;Password=$appPassword;Encrypt=True;TrustServerCertificate=True"
  $name = Invoke-Sql $connection "SELECT DB_NAME();"
  Write-Host "OK  $name"
}
$version = Invoke-Sql $AdminConnection "SELECT CAST(SERVERPROPERTY('ProductVersion') AS nvarchar(32)) + ' ' + CAST(SERVERPROPERTY('Edition') AS nvarchar(64));"
Write-Host "`nListo: SQL Server $version en localhost:$Port." -ForegroundColor Green
