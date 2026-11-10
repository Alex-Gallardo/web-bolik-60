<#
.SYNOPSIS
  Revisa, sin cambiar nada, si un servidor está listo para el staging de Bolik Digital (BD-016).

.DESCRIPTION
  Solo lectura: no instala, no escribe archivos ni configuración y nunca pide credenciales. Lo
  corre TI en el servidor antes de staging-setup.ps1 (docs/15 §12) y se puede repetir las veces que
  haga falta. Como administrador revisa todo; sin permisos de administrador las revisiones de IIS
  quedan como «sin revisar».

  Cada línea sale como OK, AVISO (funciona, pero conviene revisarlo), FALTA (bloquea staging) o
  INFO. Termina con código 1 si hay algo en FALTA.

  Revisa los requisitos de docs/15 §2 y lo propio de un servidor compartido: qué otros sitios usan
  ARR como proxy (staging-setup.ps1 cambia valores de ARR para todo el servidor), choques de enlaces
  con el dominio de staging y si el puerto de Node ya está ocupado.

.EXAMPLE
  # PowerShell como administrador, desde la raíz del repo:
  powershell -ExecutionPolicy Bypass -File scripts\deploy\staging-preflight.ps1 `
    -HostName staging.bolik66.com -ServiceAccount ".\svc-bolik" -SqlServer localhost
#>
[CmdletBinding(PositionalBinding = $false)]
param(
  [string]$HostName = "staging.bolik66.com",
  [string]$ServiceAccount = "",
  [string]$Base = "D:\bolik-stg",
  [int]$Port = 3100,
  [string]$SiteName = "staging-bolik",
  [string]$ServiceName = "BolikDigital-Staging",
  # Equipo del SQL Server (sin instancia): el puerto va aparte.
  [string]$SqlServer = "localhost",
  [int]$SqlPort = 1433,
  [string]$Node = "C:\Program Files\nodejs\node.exe",
  [string]$Nssm = "nssm"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$results = New-Object System.Collections.Generic.List[object]
function Add-Result([string]$Area, [string]$Status, [string]$Detail) {
  $results.Add([pscustomobject]@{ Area = $Area; Estado = $Status; Detalle = $Detail })
}
# Una revisión que lanza una excepción no detiene las demás: queda como «sin revisar».
function Invoke-Check([string]$Area, [scriptblock]$Check) {
  try { & $Check } catch { Add-Result $Area "AVISO" "Sin revisar: $($_.Exception.Message)" }
}

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
  [Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
  Add-Result "Permisos" "AVISO" "Sin permisos de administrador: IIS y la cuenta de servicio pueden quedar sin revisar."
}

Invoke-Check "Windows" {
  $os = Get-CimInstance Win32_OperatingSystem
  $cpu = (Get-CimInstance Win32_ComputerSystem).NumberOfLogicalProcessors
  $ramGb = [math]::Round($os.TotalVisibleMemorySize / 1MB, 1)
  $status = if ($os.Caption -match "Server (2019|2022|2025)" -and $cpu -ge 4 -and $ramGb -ge 7.5) { "OK" } else { "AVISO" }
  Add-Result "Windows" $status "$($os.Caption), $cpu vCPU, $ramGb GB de RAM (docs/15 §2 pide Server 2019/2022, 4 vCPU y 8 GB)."
}

Invoke-Check "Disco" {
  $drive = Split-Path -Qualifier $Base
  $disk = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='$drive'"
  if (-not $disk) { Add-Result "Disco" "FALTA" "No existe la unidad $drive (usa -Base con otra unidad)."; return }
  $freeGb = [math]::Round($disk.FreeSpace / 1GB, 1)
  $status = if ($freeGb -ge 40) { "OK" } else { "AVISO" }
  Add-Result "Disco" $status "$freeGb GB libres en $drive (se piden 40 GB)."
}

Invoke-Check "Node.js" {
  if (-not (Test-Path $Node)) { Add-Result "Node.js" "FALTA" "No está en $Node (instálalo para todos los usuarios o usa -Node)."; return }
  $version = [version]((& $Node --version).TrimStart("v"))
  $status = if ($version -ge [version]"22.12.0") { "OK" } else { "FALTA" }
  Add-Result "Node.js" $status "Versión $version en $Node (mínimo 22.12, engines de package.json)."
}

Invoke-Check "NSSM" {
  $cmd = Get-Command $Nssm -ErrorAction SilentlyContinue
  if ($cmd) { Add-Result "NSSM" "OK" $cmd.Source } else { Add-Result "NSSM" "FALTA" "No está en el PATH (o usa -Nssm)." }
}

# Para construir en el propio servidor (staging-build.ps1): git, bash de Git for Windows y pnpm.
Invoke-Check "Build" {
  $missing = New-Object System.Collections.Generic.List[string]
  $git = Get-Command git -ErrorAction SilentlyContinue
  if (-not $git) { $missing.Add("git") }
  # El bash de Git for Windows, junto a git (el de C:\Windows\System32 es WSL y no sirve).
  else {
    $dir = Split-Path $git.Source -Parent
    $bash = $null
    for ($i = 0; $i -lt 3 -and $dir -and -not $bash; $i++) {
      $dir = Split-Path $dir -Parent
      if ($dir -and (Test-Path (Join-Path $dir "bin\bash.exe"))) { $bash = Join-Path $dir "bin\bash.exe" }
    }
    if (-not $bash) { $missing.Add("bash de Git for Windows") }
  }
  if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) { $missing.Add("pnpm") }
  if ($missing.Count) {
    Add-Result "Build" "AVISO" "Falta $($missing -join ', '): solo hace falta si el paquete se construye aquí (Git for Windows; pnpm con 'corepack enable')."
  } else {
    Add-Result "Build" "OK" "git, bash de Git for Windows y pnpm presentes."
  }
}

$iisReady = $false
Invoke-Check "IIS" {
  if (-not (Get-Service W3SVC -ErrorAction SilentlyContinue)) { Add-Result "IIS" "FALTA" "No está instalado IIS (servicio W3SVC)."; return }
  if (-not $isAdmin) { Add-Result "IIS" "AVISO" "Instalado; los módulos se revisan como administrador."; return }
  Import-Module WebAdministration
  $modules = @(Get-WebGlobalModule | ForEach-Object { $_.Name })
  foreach ($m in @(
      @{ Name = "RewriteModule"; Label = "URL Rewrite 2.1"; Need = "FALTA" },
      @{ Name = "ApplicationRequestRouting"; Label = "Application Request Routing 3.0"; Need = "FALTA" },
      @{ Name = "StaticCompressionModule"; Label = "compresión estática"; Need = "AVISO" },
      @{ Name = "IpRestrictionModule"; Label = "IP and Domain Restrictions (para -AllowedIps)"; Need = "AVISO" })) {
    if ($modules -contains $m.Name) { Add-Result "IIS" "OK" "$($m.Label) presente." }
    else { Add-Result "IIS" $m.Need "Falta $($m.Label) (módulo $($m.Name))." }
  }
  $schemes = @(Get-WebConfiguration -pspath "MACHINE/WEBROOT/APPHOST" -filter "system.webServer/httpCompression/scheme" | ForEach-Object { $_.name })
  if ($schemes -contains "br") { Add-Result "IIS" "OK" "Brotli disponible (IIS Compression)." }
  else { Add-Result "IIS" "AVISO" "Sin Brotli: instala IIS Compression (docs/15 §2); gzip sigue funcionando." }
  Set-Variable -Name iisReady -Value $true -Scope Script
}

if ($iisReady) {
  $apphost = "MACHINE/WEBROOT/APPHOST"

  Invoke-Check "ARR" {
    $proxy = Get-WebConfiguration -pspath $apphost -filter "system.webServer/proxy"
    $now = "enabled=$($proxy.enabled), preserveHostHeader=$($proxy.preserveHostHeader), reverseRewriteHostInResponseHeaders=$($proxy.reverseRewriteHostInResponseHeaders), responseBufferLimit=$($proxy.responseBufferLimit)"
    Add-Result "ARR" "INFO" "Valores actuales del servidor: $now. staging-setup.ps1 los deja en True, True, False y 0."
  }

  # Quién más usa ARR como proxy en este servidor: los cambios de arriba también le aplican.
  Invoke-Check "ARR" {
    $users = New-Object System.Collections.Generic.List[string]
    $unread = New-Object System.Collections.Generic.List[string]
    $isProxy = { param($rules) @($rules | Where-Object { $_.action.type -eq "Rewrite" -and $_.action.url -match "^https?://" }).Count -gt 0 }
    # Reglas globales (de todo el servidor) y granjas de ARR.
    if (& $isProxy @(Get-WebConfiguration -pspath $apphost -filter "system.webServer/rewrite/globalRules/rule")) { $users.Add("reglas globales de URL Rewrite") }
    $farms = @(Get-WebConfiguration -pspath $apphost -filter "webFarms/webFarm" -ErrorAction SilentlyContinue | ForEach-Object { $_.name })
    if ($farms.Count) { $users.Add("granjas de ARR ($($farms -join ', '))") }
    # Cada sitio, sus aplicaciones y sus directorios virtuales (pueden tener su propio web.config).
    foreach ($site in @(Get-ChildItem "IIS:\Sites")) {
      if ($site.Name -eq $SiteName) { continue }
      $paths = New-Object System.Collections.Generic.List[string]
      $paths.Add("/")
      foreach ($app in @(Get-WebApplication -Site $site.Name)) { $paths.Add($app.path) }
      foreach ($vdir in @(Get-WebVirtualDirectory -Site $site.Name)) { $paths.Add($vdir.path) }
      foreach ($path in @($paths | Sort-Object -Unique)) {
        $label = "$($site.Name)$(if ($path -ne '/') { $path })"
        $location = if ($path -eq "/") { "IIS:\Sites\$($site.Name)" } else { "IIS:\Sites\$($site.Name)$path" }
        try {
          if (& $isProxy @(Get-WebConfiguration -pspath $location -filter "system.webServer/rewrite/rules/rule")) { $users.Add($label) }
        } catch { $unread.Add($label) }
      }
    }
    if ($unread.Count) {
      Add-Result "ARR" "AVISO" "No se pudo leer la configuración de: $($unread -join ', '). Revísalas a mano antes de staging-setup.ps1."
    }
    if ($users.Count) {
      Add-Result "ARR" "AVISO" "Ya hacen proxy con ARR: $($users -join ', '). Confirma con TI que aceptan responseBufferLimit=0 y preserveHostHeader=True antes de staging-setup.ps1."
    } else {
      Add-Result "ARR" "OK" "No se encontraron otros sitios, reglas globales ni granjas que usen ARR (subcarpetas con su propio web.config fuera de aplicaciones y directorios virtuales no se revisan)."
    }
  }

  Invoke-Check "Sitios" {
    $sites = @(Get-ChildItem "IIS:\Sites")
    $summary = @($sites | ForEach-Object {
        $bindings = @($_.bindings.Collection | ForEach-Object { "$($_.protocol) $($_.bindingInformation)" }) -join "; "
        "$($_.Name) [$($_.State)] $bindings"
      }) -join " | "
    Add-Result "Sitios" "INFO" $(if ($summary) { $summary } else { "No hay sitios." })
    foreach ($site in $sites) {
      if ($site.Name -eq $SiteName) { continue }
      foreach ($b in @($site.bindings.Collection)) {
        if ($b.bindingInformation -match ":$([regex]::Escape($HostName))$") {
          Add-Result "Sitios" "FALTA" "El sitio $($site.Name) ya usa $HostName ($($b.protocol) $($b.bindingInformation))."
        }
      }
    }
    if (Test-Path "IIS:\Sites\$SiteName") { Add-Result "Sitios" "INFO" "El sitio $SiteName ya existe (staging-setup.ps1 lo vuelve a ajustar)." }
  }
}

Invoke-Check "Puerto" {
  $listen = @(Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)
  if (-not $listen.Count) { Add-Result "Puerto" "OK" "$Port libre."; return }
  $owners = @($listen | ForEach-Object { $_.OwningProcess } | Sort-Object -Unique | ForEach-Object {
      $p = Get-Process -Id $_ -ErrorAction SilentlyContinue
      if ($p) { "$($p.ProcessName) (PID $_)" } else { "PID $_" }
    }) -join ", "
  $svc = Get-CimInstance Win32_Service -Filter "Name='$ServiceName'" -ErrorAction SilentlyContinue
  $ours = $svc -and $svc.State -eq "Running"
  if ($ours) { Add-Result "Puerto" "INFO" "$Port en uso por $owners; el servicio $ServiceName está corriendo." }
  else { Add-Result "Puerto" "FALTA" "$Port ya lo usa ${owners}: elige otro con -Port en todos los scripts." }
}

Invoke-Check "Cuenta" {
  if (-not $ServiceAccount) { Add-Result "Cuenta" "AVISO" "Sin -ServiceAccount: no se revisa la cuenta de servicio."; return }
  $name = $ServiceAccount -replace '^\.\\', ''
  try { $sid = (New-Object Security.Principal.NTAccount $name).Translate([Security.Principal.SecurityIdentifier]) }
  catch { Add-Result "Cuenta" "FALTA" "No existe la cuenta $ServiceAccount."; return }
  if (-not $isAdmin) { Add-Result "Cuenta" "OK" "$ServiceAccount existe ($sid); la pertenencia a Administradores se revisa como administrador."; return }
  # Miembros directos del grupo Administradores (S-1-5-32-544, con cualquier idioma de Windows).
  $group = [ADSI]"WinNT://./$((New-Object Security.Principal.SecurityIdentifier 'S-1-5-32-544').Translate([Security.Principal.NTAccount]).Value.Split('\')[-1]),group"
  $members = @($group.Invoke("Members") | ForEach-Object {
      $bytes = $_.GetType().InvokeMember("objectSid", "GetProperty", $null, $_, $null)
      (New-Object Security.Principal.SecurityIdentifier $bytes, 0).Value
    })
  if ($members -contains $sid.Value) { Add-Result "Cuenta" "FALTA" "$ServiceAccount es administradora: el servicio debe correr sin privilegios (docs/15 §2)." }
  else { Add-Result "Cuenta" "OK" "$ServiceAccount existe y no es miembro directo de Administradores." }
}

Invoke-Check "Servicio" {
  $svc = Get-CimInstance Win32_Service -Filter "Name='$ServiceName'" -ErrorAction SilentlyContinue
  if ($svc) { Add-Result "Servicio" "INFO" "$ServiceName existe: $($svc.State), inicio $($svc.StartMode), cuenta $($svc.StartName)." }
  else { Add-Result "Servicio" "INFO" "$ServiceName todavía no existe (lo crea staging-setup.ps1)." }
}

Invoke-Check "Certificado" {
  $domain = $HostName -replace '^[^.]+\.', ''
  $certs = @(Get-ChildItem Cert:\LocalMachine\My | Where-Object {
      $names = @($_.DnsNameList | ForEach-Object { $_.Unicode })
      $names -contains $HostName -or $names -contains "*.$domain"
    } | Sort-Object NotAfter -Descending)
  if (-not $certs.Count) {
    Add-Result "Certificado" "FALTA" "No hay certificado para $HostName en LocalMachine\My (sin él staging queda en HTTP)."
    return
  }
  $c = $certs[0]
  $days = [int]($c.NotAfter - (Get-Date)).TotalDays
  $status = if (-not $c.HasPrivateKey -or $days -lt 0) { "FALTA" } elseif ($days -lt 30) { "AVISO" } else { "OK" }
  Add-Result "Certificado" $status "Huella $($c.Thumbprint), vence $($c.NotAfter.ToString('yyyy-MM-dd')) ($days días), clave privada: $($c.HasPrivateKey)."
}

Invoke-Check "DNS" {
  try { $ips = @([Net.Dns]::GetHostAddresses($HostName) | ForEach-Object { $_.IPAddressToString }) }
  catch { Add-Result "DNS" "FALTA" "$HostName no resuelve: falta el registro DNS."; return }
  # bolik66.com tiene un comodín público: cualquier subdominio resuelve al hosting actual aunque
  # nadie haya creado el registro de staging.
  $local = @(Get-NetIPAddress -ErrorAction SilentlyContinue | ForEach-Object { $_.IPAddress })
  if (@($ips | Where-Object { $local -contains $_ }).Count) { Add-Result "DNS" "OK" "$HostName → $($ips -join ', '), este servidor." }
  else { Add-Result "DNS" "AVISO" "$HostName → $($ips -join ', '), que no es este servidor: falta el registro DNS (o es una IP pública con NAT; confírmalo con TI)." }
}

Invoke-Check "SQL Server" {
  $client = New-Object Net.Sockets.TcpClient
  try {
    # Wait lanza una excepción si la conexión se rechaza o el nombre no existe: también es FALTA.
    $ok = try { $client.ConnectAsync($SqlServer, $SqlPort).Wait(5000) } catch { $false }
    if ($ok -and $client.Connected) { Add-Result "SQL Server" "OK" "$SqlServer`:$SqlPort responde (TCP)." }
    else { Add-Result "SQL Server" "FALTA" "$SqlServer`:$SqlPort no responde (¿nombre, TCP activo, firewall, instancia con puerto dinámico?)." }
  } finally { $client.Dispose() }
}

# Salida a internet que necesita el build: registro de npm y Google Fonts (next/font, docs/15 §5).
[Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12
foreach ($url in @("https://registry.npmjs.org/", "https://fonts.googleapis.com/css2?family=DM+Sans", "https://fonts.gstatic.com/")) {
  Invoke-Check "Internet" {
    try {
      $r = Invoke-WebRequest $url -Method Head -UseBasicParsing -TimeoutSec 10
      Add-Result "Internet" "OK" "$url responde ($($r.StatusCode))."
    } catch [System.Net.WebException] {
      # Una respuesta HTTP (404, 405…) también prueba que hay salida.
      if ($_.Exception.Response) { Add-Result "Internet" "OK" "$url responde ($([int]$_.Exception.Response.StatusCode))." }
      else { Add-Result "Internet" "AVISO" "$url sin respuesta: $($_.Exception.Message) Solo bloquea si el paquete se construye aquí." }
    }
  }
}

Invoke-Check "Carpetas" {
  $envFile = Join-Path $Base "config\staging.env"
  if (Test-Path $envFile) { Add-Result "Carpetas" "INFO" "Existe $envFile." }
  elseif (Test-Path $Base) { Add-Result "Carpetas" "INFO" "Existe $Base, sin config\staging.env." }
  else { Add-Result "Carpetas" "INFO" "$Base todavía no existe (lo crea staging-setup.ps1)." }
}

$results | Format-Table -AutoSize -Wrap | Out-String -Width 220 | Write-Host
$blocking = @($results | Where-Object { $_.Estado -eq "FALTA" })
if ($blocking.Count) {
  Write-Host "$($blocking.Count) requisito(s) en FALTA: resuélvelos antes de staging-setup.ps1." -ForegroundColor Red
  exit 1
}
Write-Host "Sin requisitos en FALTA. Revisa los AVISO con TI y sigue con staging-setup.ps1 (docs/15 §12)." -ForegroundColor Green
