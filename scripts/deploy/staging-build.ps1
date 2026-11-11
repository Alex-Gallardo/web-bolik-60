<#
.SYNOPSIS
  Construye el paquete de STAGING de Bolik Digital (BD-016): migra, siembra, compila y empaca.

.DESCRIPTION
  Se corre desde un clon limpio del commit que se va a desplegar, en una máquina con acceso a
  BolikDigital_Stg y salida a npm y Google Fonts (normalmente el propio servidor de staging,
  docs/15 §12). En el servidor va como administrador: staging.env solo lo leen la cuenta de
  servicio y los administradores, y el clon dentro de D:\bolik-stg hereda ese mismo permiso.

  Las variables salen del mismo staging.env que usa el servicio (-EnvFile): el build lee la base y
  deja fijas las NEXT_PUBLIC_* de staging. Se cargan solo en este proceso y se borran al terminar.
  MIGRATE_DATABASE_URL (usuario bolik_migrator) no vive en ningún archivo: se pide al migrar.

  Orden de docs/15 §12 con DATA_SOURCE=db:
  1. pnpm install --frozen-lockfile --config.node-linker=hoisted (antes de cargar secretos).
  2. pnpm db:deploy con MIGRATE_DATABASE_URL.
  3. pnpm db:seed: --profile prod, o --profile dev --allow-sample-data con -SampleData.
  4. pnpm build (lee la base).
  5. scripts/ci/package.sh → bolik-<commit>.tar.gz en -OutDir.
  Con DATA_SOURCE=fixtures el build no lee la base: se omiten 2 y 3.

.EXAMPLE
  # Desde la raíz del clon, en PowerShell como administrador:
  powershell -ExecutionPolicy Bypass -File scripts\deploy\staging-build.ps1 -SampleData
#>
# Sin parámetros por posición: un valor suelto no debe caer en otro parámetro.
[CmdletBinding(PositionalBinding = $false)]
param(
  [string]$EnvFile = "D:\bolik-stg\config\staging.env",
  [string]$OutDir = "",
  # Datos de ejemplo en staging hasta que llegue el catálogo real (BD-038): perfil dev en _Stg.
  [switch]$SampleData,
  # Crea el admin inicial con este correo; la contraseña se pide sin eco.
  [string]$SeedAdminEmail = "",
  [switch]$SkipMigrate,
  [switch]$SkipSeed,
  # bash de Git for Windows (no el de WSL): por defecto, el que viene junto a git.
  [string]$Bash = ""
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
if (-not $OutDir) { $OutDir = Split-Path $RepoRoot -Parent }

function Write-Step([string]$Text) { Write-Host "`n==> $Text" -ForegroundColor Cyan }

# pnpm, git y bash terminan con código ≠ 0 sin lanzar excepción: se convierte en error.
function Invoke-Native([string]$Label, [scriptblock]$Command) {
  & $Command
  if ($LASTEXITCODE -ne 0) { throw "$Label falló (código $LASTEXITCODE)." }
}

# Los secretos van directo al entorno del proceso, sin pasar como argumento de una función (el
# registro de módulos de PowerShell, si TI lo activa, anota los argumentos).
$loaded = New-Object System.Collections.Generic.List[string]
function Read-SecretInto([string]$Name, [string]$Prompt) {
  $secure = Read-Host $Prompt -AsSecureString
  if ($secure.Length -eq 0) { throw "$Prompt vacío: se canceló." }
  if (-not $loaded.Contains($Name)) { $loaded.Add($Name) }
  [Environment]::SetEnvironmentVariable($Name, [Net.NetworkCredential]::new("", $secure).Password, "Process")
}
function Clear-ProcessEnv([string]$Name) { [Environment]::SetEnvironmentVariable($Name, $null, "Process") }

Push-Location $RepoRoot
try {
  Write-Step "0/5 Clon limpio"
  if (-not (Get-Command git -ErrorAction SilentlyContinue)) { throw "No está git en el PATH (instala Git for Windows)." }
  if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) { throw "No está pnpm en el PATH ('corepack enable' como administrador)." }
  # next build y prisma.config.ts leen los .env* del proyecto y completarían lo que falte con
  # valores de desarrollo.
  $localEnv = @(Get-ChildItem -Force -File -Filter ".env*" | Where-Object { $_.Name -ne ".env.example" } | ForEach-Object { $_.Name })
  if ($localEnv.Count) { throw "El clon tiene $($localEnv -join ', '): usa un clon limpio, sin .env locales." }
  $dirty = @(git status --porcelain)
  if ($LASTEXITCODE -ne 0) { throw "No es un repositorio git: corre el script desde un clon." }
  if ($dirty.Count) { throw "El clon tiene cambios sin commit: el paquete debe salir de un commit exacto.`n$($dirty -join "`n")" }
  $commit = (git rev-parse --short HEAD).Trim()
  $branch = (git rev-parse --abbrev-ref HEAD).Trim()
  if ($branch -ne "develop") { Write-Warning "Estás en '$branch', no en develop." }
  if (-not $Bash) {
    # git.exe está en Git\cmd o en Git\mingw64\bin; bash.exe, en Git\bin.
    $dir = Split-Path (Get-Command git).Source -Parent
    for ($i = 0; $i -lt 3 -and $dir -and -not $Bash; $i++) {
      $dir = Split-Path $dir -Parent
      if ($dir -and (Test-Path (Join-Path $dir "bin\bash.exe"))) { $Bash = Join-Path $dir "bin\bash.exe" }
    }
  }
  if (-not $Bash -or -not (Test-Path $Bash)) { throw "No se encontró el bash de Git for Windows (usa -Bash)." }
  if (-not (Test-Path $EnvFile)) { throw "No existe $EnvFile (lo crea staging-setup.ps1; usa -EnvFile)." }
  if (-not (Test-Path $OutDir)) { throw "No existe la carpeta de salida $OutDir." }
  Write-Host "Commit $commit ($branch)."

  Write-Step "1/5 Dependencias"
  # confirmModulesPurge=false: si node_modules tenía la estructura de pnpm, se rehace sin preguntar.
  Invoke-Native "pnpm install" { pnpm install --frozen-lockfile --config.node-linker=hoisted --config.confirmModulesPurge=false }

  Write-Step "Variables de $EnvFile"
  # Mismo analizador que node --env-file (el servicio): comentarios, comillas y valores con '#'.
  $previousEncoding = [Console]::OutputEncoding
  [Console]::OutputEncoding = [Text.Encoding]::UTF8
  try {
    $json = & node -e "const u=require('util'),f=require('fs');process.stdout.write(JSON.stringify(u.parseEnv(f.readFileSync(process.argv[1],'utf8'))))" $EnvFile
  } finally { [Console]::OutputEncoding = $previousEncoding }
  if ($LASTEXITCODE -ne 0) { throw "No se pudo leer $EnvFile." }
  $vars = $json | ConvertFrom-Json
  $names = @($vars.PSObject.Properties | ForEach-Object { $_.Name })
  if (-not $names.Count) { throw "$EnvFile no tiene variables: complétalo con los valores de docs/15 §11." }
  foreach ($p in $vars.PSObject.Properties) {
    if (-not $loaded.Contains($p.Name)) { $loaded.Add($p.Name) }
    [Environment]::SetEnvironmentVariable($p.Name, [string]$p.Value, "Process")
  }
  $vars = $null
  $json = $null
  # El build y el seed solo deben ver lo de staging.env, nunca una variable del usuario que corre.
  foreach ($name in @("MIGRATE_DATABASE_URL", "SHADOW_DATABASE_URL", "SKIP_ENV_VALIDATION", "SEED_ADMIN_EMAIL", "SEED_ADMIN_PASSWORD")) {
    if ($names -notcontains $name) { Clear-ProcessEnv $name }
  }
  foreach ($name in @("MIGRATE_DATABASE_URL", "SEED_ADMIN_PASSWORD")) {
    if ($names -contains $name) {
      Write-Warning "$EnvFile trae $name y el servicio puede leerlo: quítalo de ahí (este script lo pide cuando hace falta)."
    }
  }
  if ($env:APP_ENV -ne "staging") { throw "APP_ENV de $EnvFile es '$($env:APP_ENV)': este script es solo para staging." }
  if ($env:NEXT_PUBLIC_SITE_URL -notmatch '^https://') { throw "NEXT_PUBLIC_SITE_URL debe empezar con https:// (es '$($env:NEXT_PUBLIC_SITE_URL)')." }
  $usesDb = $env:DATA_SOURCE -eq "db"
  Write-Host "APP_ENV=staging, NEXT_PUBLIC_SITE_URL=$($env:NEXT_PUBLIC_SITE_URL), DATA_SOURCE=$($env:DATA_SOURCE)."
  if ((-not $usesDb -or $SkipSeed) -and ($SampleData -or $SeedAdminEmail)) {
    Write-Warning "-SampleData y -SeedAdminEmail no hacen nada sin seed (DATA_SOURCE=fixtures o -SkipSeed)."
  }

  Write-Step "2/5 Migraciones"
  if (-not $usesDb) { Write-Host "DATA_SOURCE=fixtures: el build no lee la base, se omite." }
  elseif ($SkipMigrate) { Write-Warning "Se omite (-SkipMigrate): el build fallará si la base no está al día." }
  else {
    Read-SecretInto "MIGRATE_DATABASE_URL" "MIGRATE_DATABASE_URL (usuario bolik_migrator)"
    try { Invoke-Native "pnpm db:deploy" { pnpm db:deploy } }
    finally { Clear-ProcessEnv "MIGRATE_DATABASE_URL" }
  }

  Write-Step "3/5 Datos iniciales"
  if (-not $usesDb) { Write-Host "DATA_SOURCE=fixtures: se omite." }
  elseif ($SkipSeed) { Write-Host "Se omite (-SkipSeed)." }
  else {
    if ($SeedAdminEmail) {
      [Environment]::SetEnvironmentVariable("SEED_ADMIN_EMAIL", $SeedAdminEmail, "Process")
      Read-SecretInto "SEED_ADMIN_PASSWORD" "Contraseña del admin inicial ($SeedAdminEmail)"
    }
    try {
      # dev sincroniza con los JSON (pisa lo editado en el admin); prod solo crea lo que falta.
      if ($SampleData) { Invoke-Native "pnpm db:seed" { pnpm db:seed --profile dev --allow-sample-data } }
      else { Invoke-Native "pnpm db:seed" { pnpm db:seed --profile prod } }
    } finally {
      Clear-ProcessEnv "SEED_ADMIN_EMAIL"
      Clear-ProcessEnv "SEED_ADMIN_PASSWORD"
    }
  }

  Write-Step "4/5 Build"
  Invoke-Native "pnpm build" { pnpm build }

  Write-Step "5/5 Paquete"
  $packageName = "bolik-$commit.tar.gz"
  # Ruta relativa: el tar de Git Bash tomaría 'C:' de una ruta absoluta como un equipo remoto.
  Invoke-Native "package.sh" { & $Bash scripts/ci/package.sh $packageName }
  $package = Join-Path $OutDir $packageName
  Move-Item -Force (Join-Path $RepoRoot $packageName) $package
  $hash = (Get-FileHash $package -Algorithm SHA256).Hash
  Write-Host "`nListo: $package" -ForegroundColor Green
  Write-Host "SHA256 $hash"
  Write-Host "Siguiente paso (como administrador): scripts\deploy\staging-deploy.ps1 -Package `"$package`" -Sha256 $hash -ServiceAccount <cuenta>"
} finally {
  foreach ($var in $loaded) { Clear-ProcessEnv $var }
  Pop-Location
}
