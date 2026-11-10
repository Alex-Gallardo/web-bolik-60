#Requires -RunAsAdministrator
<#
.SYNOPSIS
  Despliega un paquete en STAGING de Bolik Digital (BD-016) y vuelve atrás solo si falla.

.DESCRIPTION
  Lo corre TI como administrador en el servidor de staging, con el paquete de staging-build.ps1
  (docs/15 §12). Es la versión manual de staging de deploy.ps1 (BD-141). -HostName, -Base, -Port
  y -ServiceName deben ser los mismos que se pasaron a staging-setup.ps1.

  1. Extrae el paquete en releases\<fecha>_<commit> (verifica -Sha256 si se pasa) y le da a la
     cuenta de servicio permiso de escritura en .next (caché y páginas que se regeneran al editar
     en el admin).
  2. Detiene el servicio y comprueba que nada siga escuchando en -Port; apunta la junction
     'current' al release nuevo y lo inicia.
  3. Prueba de humo: Node (127.0.0.1:-Port) sirve el BUILD_ID del release nuevo y la home responde
     200 con X-Robots-Tag noindex; después, lo mismo a través de IIS con -HostName.
  4. Si algo falla, vuelve al release anterior (o al marcador vacío en el primer despliegue) y
     marca el release nuevo como _fallido.
  5. Conserva los -Keep releases buenos más recientes y el último fallido; nunca borra el que corre.

  Las migraciones y el seed ya corrieron en staging-build.ps1, antes del build.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File scripts\deploy\staging-deploy.ps1 `
    -Package D:\bolik-stg\build\bolik-a1b2c3d.tar.gz -ServiceAccount ".\svc-bolik" -Sha256 <hash>
#>
# Sin parámetros por posición: un valor suelto no debe caer en otro parámetro.
[CmdletBinding(PositionalBinding = $false)]
param(
  [Parameter(Mandatory)][string]$Package,
  [Parameter(Mandatory)][string]$ServiceAccount,
  [string]$HostName = "staging.bolik66.com",
  [ValidatePattern('^\S+$')][string]$Base = "D:\bolik-stg",
  [int]$Port = 3100,
  [string]$ServiceName = "BolikDigital-Staging",
  [string]$SiteName = "staging-bolik",
  [ValidateRange(2, 20)][int]$Keep = 5,
  # SHA256 que imprimió staging-build.ps1: comprueba que el paquete no cambió al copiarlo.
  [ValidatePattern('^([0-9A-Fa-f]{64})?$')][string]$Sha256 = "",
  # Segundos que se espera a que Node responda después de iniciar el servicio.
  [int]$TimeoutSec = 90
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$App = Join-Path $Base "app"
$Releases = Join-Path $App "releases"
$Current = Join-Path $App "current"
# Destino de 'current' antes del primer despliegue (staging-setup.ps1).
$Placeholder = Join-Path $App "vacio"
$FailedSuffix = "_fallido"

function Write-Step([string]$Text) { Write-Host "`n==> $Text" -ForegroundColor Cyan }

function Get-JunctionTarget([string]$Path) {
  $item = Get-Item -LiteralPath $Path -Force -ErrorAction SilentlyContinue
  if (-not $item -or -not $item.Target) { return $null }
  # En PowerShell 5.1 Target es un arreglo; en 7, un texto.
  return @($item.Target)[0]
}

function Set-Current([string]$Target) {
  if (Get-Item -LiteralPath $Current -Force -ErrorAction SilentlyContinue) {
    cmd /c rmdir "$Current" | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "No se pudo quitar la junction $Current." }
  }
  cmd /c mklink /J "$Current" "$Target" | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "No se pudo apuntar $Current a $Target." }
}

# Detiene el servicio y exige que el puerto quede libre: si un Node viejo siguiera escuchando, la
# prueba de humo le preguntaría a él y aprobaría el release anterior.
function Stop-AppService {
  Stop-Service $ServiceName -ErrorAction SilentlyContinue
  $deadline = (Get-Date).AddSeconds(30)
  while ($true) {
    $stopped = (Get-Service $ServiceName).Status -eq "Stopped"
    $listening = @(Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)
    if ($stopped -and -not $listening.Count) { return }
    if ((Get-Date) -gt $deadline) {
      $who = @($listening | ForEach-Object { $_.OwningProcess } | Sort-Object -Unique) -join ", "
      throw "$ServiceName no se detuvo o el puerto $Port sigue ocupado (PID $who). Detén ese proceso a mano y vuelve a desplegar."
    }
    Start-Sleep -Seconds 2
  }
}

function Start-AppService {
  try { Start-Service $ServiceName }
  catch {
    throw "No arrancó $ServiceName ($($_.Exception.Message)). Error 1069: en el registro del sistema, el evento 7038 es una contraseña incorrecta (staging-setup.ps1 -ResetPassword) y el 7041 que falta el derecho 'Iniciar sesión como servicio' (docs/15 §12)."
  }
}

# GET; devuelve el código y la cabecera X-Robots-Tag, o lanza si no hay respuesta HTTP.
function Get-Url([string]$Url) {
  try {
    $r = Invoke-WebRequest $Url -UseBasicParsing -TimeoutSec 15 -MaximumRedirection 0
    return @{ Status = [int]$r.StatusCode; Robots = [string]$r.Headers["X-Robots-Tag"] }
  } catch [System.Net.WebException] {
    $response = $_.Exception.Response
    if (-not $response) { throw }
    return @{ Status = [int]$response.StatusCode; Robots = [string]$response.Headers["X-Robots-Tag"] }
  }
}

function Test-Smoke([string]$BuildId) {
  Write-Host "Esperando a Node en http://127.0.0.1:$Port/ (hasta $TimeoutSec s)…"
  $deadline = (Get-Date).AddSeconds($TimeoutSec)
  $node = $null
  while (-not $node) {
    try { $node = Get-Url "http://127.0.0.1:$Port/" }
    catch {
      if ((Get-Date) -gt $deadline) { throw "Node no respondió en $TimeoutSec s. Revisa $(Join-Path $Base 'logs\app-error.log')." }
      Start-Sleep -Seconds 3
    }
  }
  if ($node.Status -ne 200) { throw "Node respondió $($node.Status) en la home (se esperaba 200)." }
  if ($node.Robots -notmatch "noindex") { throw "Node no manda X-Robots-Tag noindex: el build no se hizo con APP_ENV=staging." }
  # Node sirve los estáticos de su propia carpeta: solo el release nuevo tiene este BUILD_ID.
  $manifest = Get-Url "http://127.0.0.1:$Port/_next/static/$BuildId/_buildManifest.js"
  if ($manifest.Status -ne 200) { throw "Node no sirve el build $BuildId ($($manifest.Status)): sigue corriendo otro release." }
  Write-Host "Node: build $BuildId, home 200, X-Robots-Tag: $($node.Robots)."

  # A través de IIS, en este mismo servidor: --resolve evita depender del DNS y conserva el SNI;
  # --noproxy para no salir por un proxy del entorno.
  $https = Get-WebBinding -Name $SiteName -Protocol https -HostHeader $HostName -ErrorAction SilentlyContinue
  $proto = if ($https) { "https" } else { "http" }
  $iisPort = if ($https) { 443 } else { 80 }
  $out = @(& curl.exe -sS --noproxy "*" --ssl-no-revoke -o NUL -D - --max-time 20 --resolve "${HostName}:${iisPort}:127.0.0.1" "${proto}://${HostName}/")
  if ($LASTEXITCODE -ne 0) {
    $hint = if ($LASTEXITCODE -eq 60) { " El certificado no es de confianza en este servidor (¿CA interna fuera de Raíz?)." } else { "" }
    throw "IIS no respondió en ${proto}://${HostName}/ (curl $LASTEXITCODE): $($out -join ' ')$hint"
  }
  $statusLines = @($out | Where-Object { $_ -match '^HTTP/' })
  if (-not $statusLines.Count) { throw "IIS no devolvió una respuesta HTTP en ${proto}://${HostName}/." }
  $statusLine = $statusLines[$statusLines.Count - 1]
  if ($statusLine -notmatch '^HTTP/\S+ 200') { throw "IIS respondió '$statusLine' en ${proto}://${HostName}/ (se esperaba 200)." }
  if (-not @($out | Where-Object { $_ -match '^X-Robots-Tag:.*noindex' }).Count) { throw "IIS no manda X-Robots-Tag noindex." }
  Write-Host "IIS: $statusLine en ${proto}://${HostName}/ con X-Robots-Tag noindex."
  if ($proto -eq "http") { Write-Warning "El sitio sigue sin HTTPS: vuelve a correr staging-setup.ps1 con -CertThumbprint." }
}

Write-Step "0/5 Requisitos"
$Package = (Resolve-Path $Package).Path
if ($Package -notmatch '\.tar\.gz$') { throw "$Package no es un .tar.gz de staging-build.ps1." }
if (-not (Get-Service $ServiceName -ErrorAction SilentlyContinue)) { throw "No existe el servicio ${ServiceName}: corre antes staging-setup.ps1." }
if (-not (Test-Path $Releases)) { throw "No existe ${Releases}: corre antes staging-setup.ps1." }
Import-Module WebAdministration
if (-not (Test-Path "IIS:\Sites\$SiteName")) { throw "No existe el sitio IIS ${SiteName}: corre antes staging-setup.ps1." }
if ($Sha256) {
  $actual = (Get-FileHash $Package -Algorithm SHA256).Hash
  if ($actual -ne $Sha256.ToUpper()) { throw "El SHA256 de $Package no coincide ($actual): vuelve a copiar el paquete." }
  Write-Host "SHA256 verificado."
} else {
  Write-Warning "Sin -Sha256: no se comprueba que el paquete sea el que salió de staging-build.ps1."
}
$commit = if ((Split-Path $Package -Leaf) -match '^bolik-([0-9a-f]{7,40})\.tar\.gz$') { $Matches[1] } else { "manual" }
$previous = Get-JunctionTarget $Current
Write-Host "Paquete $Package (commit $commit). Release actual: $(if ($previous) { $previous } else { 'ninguno' })."

Write-Step "1/5 Extraer"
$release = Join-Path $Releases "$(Get-Date -Format yyyy-MM-dd_HHmmss)_$commit"
New-Item -ItemType Directory $release | Out-Null
& tar.exe -xzf $Package -C $release
if ($LASTEXITCODE -ne 0) { throw "tar no pudo extraer $Package." }
foreach ($required in @("server.js", ".next\BUILD_ID", ".next\static", "public")) {
  if (-not (Test-Path (Join-Path $release $required))) { throw "Al paquete le falta ${required}: ármalo con staging-build.ps1." }
}
$buildId = (Get-Content (Join-Path $release ".next\BUILD_ID") -Raw).Trim()
& icacls (Join-Path $release ".next") /grant "${ServiceAccount}:(OI)(CI)M" | Out-Null
if ($LASTEXITCODE -ne 0) { throw "icacls no pudo dar permiso de escritura en .next a $ServiceAccount." }
Write-Host "Extraído en $release (build $buildId)."

Write-Step "2/5 Cambiar de release e iniciar"
try {
  Stop-AppService
  Set-Current $release
  Start-AppService
  Write-Step "3/5 Prueba de humo"
  Test-Smoke $buildId
} catch {
  $failure = $_.Exception.Message
  Write-Warning "Falló el despliegue: $failure"
  Write-Step "4/5 Volver atrás"
  $back = if ($previous -and (Test-Path (Join-Path $previous "server.js"))) { $previous } else { $Placeholder }
  $rollback = ""
  try {
    Stop-AppService
    Set-Current $back
    if ($back -ne $Placeholder) {
      Start-AppService
      $rollback = "Se volvió a $back."
    } else {
      $rollback = "No había un release anterior: el servicio queda detenido y 'current' en el marcador vacío."
    }
    # Marcado para que no cuente entre los -Keep buenos; queda para revisarlo.
    Rename-Item -LiteralPath $release -NewName "$(Split-Path $release -Leaf)$FailedSuffix" -ErrorAction SilentlyContinue
  } catch {
    $rollback = "La vuelta atrás también falló: $($_.Exception.Message) Revisa el servicio y $Current a mano."
  }
  throw "Despliegue fallido: $failure $rollback"
}
Write-Step "4/5 Volver atrás: no hace falta, el release nuevo responde"

Write-Step "5/5 Limpiar releases"
$running = Get-JunctionTarget $Current
$all = @(Get-ChildItem $Releases -Directory | Sort-Object Name -Descending)
$good = @($all | Where-Object { $_.Name -notlike "*$FailedSuffix" })
$failed = @($all | Where-Object { $_.Name -like "*$FailedSuffix" })
$old = @(@($good | Select-Object -Skip $Keep) + @($failed | Select-Object -Skip 1) | Where-Object { $_ -and $_.FullName -ne $running })
$removed = 0
foreach ($dir in $old) {
  # Un error aquí no debe marcar como fallido un despliegue que ya quedó bien.
  try { Remove-Item -LiteralPath $dir.FullName -Recurse -Force; $removed++ }
  catch { Write-Warning "No se pudo borrar $($dir.FullName): $($_.Exception.Message)" }
}
Write-Host "Se conservan los $Keep releases buenos más recientes y el último fallido ($removed borrados)."

Write-Host "`nListo: $ServiceName corre $release." -ForegroundColor Green
Write-Host "Comprueba desde tu equipo: curl.exe -sI https://$HostName/ | Select-String `"HTTP/|X-Robots-Tag`""
