#Requires -RunAsAdministrator
<#
.SYNOPSIS
  Prepara el servidor de STAGING de Bolik Digital (BD-016): carpetas, servicio de Node e IIS.

.DESCRIPTION
  Lo corre TI como administrador en el servidor de staging (docs/15 §12), al menos una vez. Es
  idempotente: lo que ya existe se vuelve a ajustar con los mismos valores (por ejemplo, al llegar
  o renovarse el certificado). No despliega la app ni guarda secretos en el repo.

  Solo para staging: el web.config que escribe lleva noindex y no tiene la regla de www.
  Producción usa el web.config de docs/15 §4.3 (BD-140).

  Requisitos (docs/15 §2): IIS 10 con URL Rewrite 2.1 y ARR 3.0, Node.js para todos los usuarios,
  NSSM en el PATH (o -Nssm), la cuenta de servicio sin privilegios y, cuando exista, el
  certificado TLS del dominio en LocalMachine\My.

  1. Carpetas de docs/15 §3 bajo -Base, con permisos explícitos (sin heredar los de la unidad).
  2. config\staging.env a partir de .env.example si no existe, legible solo por la cuenta de
     servicio y los administradores. TI completa los valores a mano.
  3. ARR a nivel de servidor: proxy activo y sin búfer de respuesta (streaming de React).
  4. Sitio IIS con web.config (proxy a Node, estáticos y medios servidos por IIS, noindex).
  5. Servicio de Windows con NSSM: node server.js en 127.0.0.1:-Port, como -ServiceAccount.

.EXAMPLE
  # PowerShell como administrador, desde la raíz del repo:
  powershell -ExecutionPolicy Bypass -File scripts\deploy\staging-setup.ps1 `
    -HostName staging.bolik66.com -ServiceAccount ".\svc-bolik" -CertThumbprint "<huella>"
#>
[CmdletBinding()]
param(
  [string]$HostName = "staging.bolik66.com",
  [string]$Base = "D:\bolik-stg",
  [int]$Port = 3100,
  [string]$ServiceName = "BolikDigital-Staging",
  [string]$SiteName = "staging-bolik",
  [Parameter(Mandatory)][string]$ServiceAccount,
  # Sin huella el sitio queda solo en HTTP; se vuelve a correr cuando llegue el certificado.
  [string]$CertThumbprint = "",
  # Vuelve a pedir la contraseña de la cuenta aunque el servicio ya corra con ella.
  [switch]$ResetPassword,
  [string]$Node = "C:\Program Files\nodejs\node.exe",
  [string]$Nssm = "nssm"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$EnvExample = Join-Path $RepoRoot ".env.example"
$App = Join-Path $Base "app"
$Releases = Join-Path $App "releases"
$Current = Join-Path $App "current"
# Destino de 'current' antes del primer despliegue. Fuera de releases\: deploy.ps1 y rollback.ps1
# ordenan esa carpeta por nombre.
$Placeholder = Join-Path $App "vacio"
$Config = Join-Path $Base "config"
$EnvFile = Join-Path $Config "staging.env"
$Media = Join-Path $Base "media"
$Logs = Join-Path $Base "logs"
$IisRoot = Join-Path $Base "iis"
$Admins = "*S-1-5-32-544"  # Administradores, con cualquier idioma de Windows
$System = "*S-1-5-18"
$apphost = "MACHINE/WEBROOT/APPHOST"

function Write-Step([string]$Text) { Write-Host "`n==> $Text" -ForegroundColor Cyan }

# icacls y nssm terminan con código ≠ 0 sin lanzar excepción: se convierte en error.
function Invoke-Icacls {
  & icacls @args | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "icacls $($args -join ' ') falló ($LASTEXITCODE)." }
}

function Invoke-Nssm {
  & $Nssm @args | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "nssm $($args -join ' ') falló ($LASTEXITCODE)." }
}

Write-Step "0/5 Requisitos"
if ($HostName -match '^(www\.)?bolik66\.com$') {
  throw "$HostName es el dominio de producción: este script es solo para staging (docs/15 §4.3 para producción)."
}
if (-not (Test-Path $Node)) { throw "No está Node.js en $Node (instálalo para todos los usuarios o usa -Node)." }
if (-not (Get-Command $Nssm -ErrorAction SilentlyContinue)) { throw "No se encontró NSSM ($Nssm): agrégalo al PATH o usa -Nssm." }
Import-Module WebAdministration
foreach ($module in @("RewriteModule", "ApplicationRequestRouting")) {
  if (-not (Get-WebGlobalModule -Name $module)) {
    throw "IIS no tiene el módulo ${module}: instala URL Rewrite 2.1 y Application Request Routing 3.0."
  }
}
# La huella copiada de certlm.msc suele traer espacios o un carácter invisible al inicio.
$Thumb = ($CertThumbprint -replace '[^0-9A-Fa-f]', '').ToUpper()
if ($Thumb -and -not (Test-Path "Cert:\LocalMachine\My\$Thumb")) {
  throw "No está el certificado $Thumb en LocalMachine\My."
}
Write-Host "Node $(& $Node --version), NSSM, URL Rewrite y ARR presentes."

Write-Step "1/5 Carpetas en $Base"
foreach ($dir in @($Releases, $Placeholder, $Config, $Media, $Logs, $IisRoot)) {
  New-Item -ItemType Directory -Force $dir | Out-Null
}
if (-not (Test-Path $Current)) {
  # Una junction rota también da False en Test-Path: se quita antes de crearla de nuevo.
  if (Get-Item -LiteralPath $Current -Force -ErrorAction SilentlyContinue) { cmd /c rmdir "$Current" | Out-Null }
  cmd /c mklink /J "$Current" "$Placeholder" | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "No se pudo crear la junction $Current." }
}
# Sin herencia de la unidad (en D:\ suele haber 'Usuarios' con permiso de crear archivos).
Invoke-Icacls $Base /inheritance:r /grant:r "${Admins}:(OI)(CI)F" "${System}:(OI)(CI)F"
Invoke-Icacls $App /grant "${ServiceAccount}:(OI)(CI)RX"
Invoke-Icacls $Media /grant "${ServiceAccount}:(OI)(CI)M"
Invoke-Icacls $Logs /grant "${ServiceAccount}:(OI)(CI)M"
# IIS sirve /_next/static y /media directamente: el anónimo entra como IUSR, el pool por IIS_IUSRS.
foreach ($who in @("IIS_IUSRS", "IUSR")) {
  foreach ($dir in @($App, $Media, $IisRoot)) { Invoke-Icacls $dir /grant "${who}:(OI)(CI)RX" }
}
Write-Host "Carpetas listas; $ServiceAccount lee la app y escribe en media y logs."

Write-Step "2/5 Variables de entorno ($EnvFile)"
if (Test-Path $EnvFile) {
  Write-Host "Ya existe: no se toca."
} else {
  # Con APP_ENV=staging la app valida como entorno desplegado: no arranca con el SESSION_SECRET de
  # ejemplo, sin https ni con el usuario sa (src/env.schema.ts).
  $content = (Get-Content $EnvExample -Encoding UTF8) `
    -replace '^APP_ENV=.*', 'APP_ENV=staging' `
    -replace '^NEXT_PUBLIC_SITE_URL=.*', "NEXT_PUBLIC_SITE_URL=https://$HostName" `
    -replace '^MEDIA_DIR=.*', "MEDIA_DIR=$Media"
  # Sin BOM: node --env-file leería el BOM como parte del primer nombre.
  [IO.File]::WriteAllLines($EnvFile, [string[]]$content, (New-Object Text.UTF8Encoding $false))
  Write-Warning "Se creó a partir de .env.example: complétalo con los valores de staging (docs/15 §11) antes del primer despliegue."
}
Invoke-Icacls $EnvFile /inheritance:r /grant:r "${ServiceAccount}:R" "${System}:F" "${Admins}:F"

Write-Step "3/5 ARR a nivel de servidor"
Set-WebConfigurationProperty -pspath $apphost -filter "system.webServer/proxy" -name "enabled" -value "True"
Set-WebConfigurationProperty -pspath $apphost -filter "system.webServer/proxy" -name "preserveHostHeader" -value "True"
Set-WebConfigurationProperty -pspath $apphost -filter "system.webServer/proxy" -name "reverseRewriteHostInResponseHeaders" -value "False"
# 0 = sin búfer: el streaming de React (Suspense) llega al navegador sin esperar.
Set-WebConfigurationProperty -pspath $apphost -filter "system.webServer/proxy" -name "responseBufferLimit" -value 0
$allowed = @(Get-WebConfigurationProperty -pspath $apphost -filter "system.webServer/rewrite/allowedServerVariables" -name "Collection" | ForEach-Object { $_.name })
foreach ($variable in @("HTTP_X_FORWARDED_PROTO", "HTTP_X_FORWARDED_HOST")) {
  if ($allowed -notcontains $variable) {
    Add-WebConfigurationProperty -pspath $apphost -filter "system.webServer/rewrite/allowedServerVariables" -name "." -value @{ name = $variable }
  }
}
Write-Host "Proxy activo y sin búfer."

Write-Step "4/5 Sitio IIS $SiteName"
# Sin certificado no se redirige a https: quedaría inaccesible.
$httpsRule = if ($Thumb) {
  @"
        <rule name="Forzar HTTPS" stopProcessing="true">
          <match url="(.*)" />
          <conditions><add input="{HTTPS}" pattern="off" /></conditions>
          <action type="Redirect" url="https://$HostName/{R:1}" redirectType="Permanent" />
        </rule>
"@
} else { "" }
$proto = if ($Thumb) { "https" } else { "http" }
$hsts = if ($Thumb) { '<add name="Strict-Transport-Security" value="max-age=31536000" />' } else { "" }
# Mismo web.config que producción (docs/15 §4.3) con el dominio y el puerto de staging, sin la
# regla de www y con X-Robots-Tag también en lo que sirve IIS (estáticos, medios, páginas de error).
$webConfig = @"
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
$httpsRule
        <rule name="Estaticos de Next" stopProcessing="true">
          <match url="^_next/static/" />
          <action type="None" />
        </rule>
        <rule name="Medios" stopProcessing="true">
          <match url="^media/" />
          <action type="None" />
        </rule>
        <rule name="Proxy a Node" stopProcessing="true">
          <match url="(.*)" />
          <serverVariables>
            <set name="HTTP_X_FORWARDED_PROTO" value="$proto" />
            <set name="HTTP_X_FORWARDED_HOST" value="{HTTP_HOST}" />
          </serverVariables>
          <action type="Rewrite" url="http://127.0.0.1:$Port/{R:1}" />
        </rule>
      </rules>
    </rewrite>
    <urlCompression doStaticCompression="true" doDynamicCompression="false" />
    <httpProtocol>
      <customHeaders>
        <remove name="X-Powered-By" />
        $hsts
        <add name="X-Robots-Tag" value="noindex, nofollow" />
      </customHeaders>
    </httpProtocol>
    <security>
      <requestFiltering removeServerHeader="true">
        <requestLimits maxAllowedContentLength="15728640" />
      </requestFiltering>
    </security>
  </system.webServer>

  <location path="_next/static">
    <system.webServer>
      <staticContent>
        <clientCache cacheControlMode="UseMaxAge" cacheControlMaxAge="365.00:00:00" cacheControlCustom="public, immutable" />
        <remove fileExtension=".woff2" /><mimeMap fileExtension=".woff2" mimeType="font/woff2" />
      </staticContent>
    </system.webServer>
  </location>
  <location path="media">
    <system.webServer>
      <staticContent>
        <clientCache cacheControlMode="UseMaxAge" cacheControlMaxAge="365.00:00:00" cacheControlCustom="public, immutable" />
        <remove fileExtension=".webp" /><mimeMap fileExtension=".webp" mimeType="image/webp" />
        <remove fileExtension=".avif" /><mimeMap fileExtension=".avif" mimeType="image/avif" />
        <remove fileExtension=".mp4" /><mimeMap fileExtension=".mp4" mimeType="video/mp4" />
      </staticContent>
    </system.webServer>
  </location>
</configuration>
"@
Set-Content -Path (Join-Path $IisRoot "web.config") -Value $webConfig -Encoding UTF8

$pool = "IIS:\AppPools\$SiteName"
if (-not (Test-Path $pool)) { New-WebAppPool -Name $SiteName | Out-Null }
# El sitio solo hace de proxy: sin .NET.
Set-ItemProperty $pool -Name managedRuntimeVersion -Value ""

if (-not (Test-Path "IIS:\Sites\$SiteName")) {
  # -Id explícito: New-Website falla sin él cuando el servidor no tiene ningún sitio.
  $ids = @(Get-ChildItem "IIS:\Sites" | ForEach-Object { [int]$_.id })
  $id = if ($ids.Count) { ($ids | Measure-Object -Maximum).Maximum + 1 } else { 1 }
  New-Website -Name $SiteName -Id $id -PhysicalPath $IisRoot -ApplicationPool $SiteName -HostHeader $HostName -Port 80 | Out-Null
}
Set-ItemProperty "IIS:\Sites\$SiteName" -Name physicalPath -Value $IisRoot
if ($Thumb) {
  if (-not (Get-WebBinding -Name $SiteName -Protocol https -HostHeader $HostName)) {
    New-WebBinding -Name $SiteName -Protocol https -Port 443 -HostHeader $HostName -SslFlags 1  # SNI
  }
  $binding = Get-WebBinding -Name $SiteName -Protocol https -HostHeader $HostName
  if ($binding.certificateHash -ne $Thumb) {
    # Renovación: IIS no deja asignar un certificado encima de otro.
    if ($binding.certificateHash) { $binding.RemoveSslCertificate() }
    $binding.AddSslCertificate($Thumb, "My")
  }
  Write-Host "HTTPS en https://$HostName con el certificado $Thumb."
} else {
  Write-Warning "Sin -CertThumbprint: el sitio queda solo en http://$HostName, sin redirección a https. Vuelve a correr el script con la huella."
}
# Directorios virtuales en la configuración del sitio: /_next no existe como carpeta en $IisRoot.
$rootApp = "system.applicationHost/sites/site[@name='$SiteName']/application[@path='/']"
foreach ($dir in @(@{ Path = "/_next/static"; Physical = (Join-Path $Current ".next\static") }, @{ Path = "/media"; Physical = $Media })) {
  $filter = "$rootApp/virtualDirectory[@path='$($dir.Path)']"
  if (Get-WebConfiguration -pspath $apphost -filter $filter) {
    Set-WebConfigurationProperty -pspath $apphost -filter $filter -name "physicalPath" -value $dir.Physical
  } else {
    Add-WebConfigurationProperty -pspath $apphost -filter $rootApp -name "." -value @{ path = $dir.Path; physicalPath = $dir.Physical }
  }
}
Write-Host "Sitio $SiteName apuntando a $IisRoot (proxy a 127.0.0.1:$Port)."
Write-Warning "Staging es solo para la red interna: limita el acceso por IP (firewall o 'IP and Domain Restrictions')."

Write-Step "5/5 Servicio $ServiceName"
if (-not (Get-Service $ServiceName -ErrorAction SilentlyContinue)) { Invoke-Nssm install $ServiceName $Node }
Invoke-Nssm set $ServiceName AppParameters "--env-file=$EnvFile server.js"
Invoke-Nssm set $ServiceName AppDirectory $Current
# HOSTNAME=127.0.0.1: Node solo escucha localmente, nadie se salta IIS.
Invoke-Nssm set $ServiceName AppEnvironmentExtra "NODE_ENV=production" "PORT=$Port" "HOSTNAME=127.0.0.1"
Invoke-Nssm set $ServiceName AppStdout (Join-Path $Logs "app.log")
Invoke-Nssm set $ServiceName AppStderr (Join-Path $Logs "app-error.log")
# Rota también con el servicio corriendo, no solo al arrancar.
Invoke-Nssm set $ServiceName AppRotateFiles 1
Invoke-Nssm set $ServiceName AppRotateOnline 1
Invoke-Nssm set $ServiceName AppRotateBytes 10485760
Invoke-Nssm set $ServiceName AppExit Default Restart
Invoke-Nssm set $ServiceName AppRestartDelay 3000
Invoke-Nssm set $ServiceName Start SERVICE_AUTO_START

# La cuenta se asigna por CIM y no con 'nssm set ObjectName': así la contraseña no pasa por la línea
# de comandos (registros de auditoría) ni puede salir en un mensaje de error.
$service = Get-CimInstance Win32_Service -Filter "Name='$ServiceName'"
$account = $ServiceAccount -replace '^\.\\', ''
if ($ResetPassword -or ($service.StartName -replace '^\.\\', '') -ne $account) {
  $credential = Get-Credential -UserName $ServiceAccount -Message "Contraseña de $ServiceAccount para el servicio $ServiceName"
  $result = Invoke-CimMethod -InputObject $service -MethodName Change -Arguments @{
    StartName     = $ServiceAccount
    StartPassword = $credential.GetNetworkCredential().Password
  }
  if ($result.ReturnValue -ne 0) { throw "Windows no aceptó la cuenta del servicio (Win32_Service.Change = $($result.ReturnValue))." }
  Write-Host "Servicio configurado como $ServiceAccount."
} else {
  Write-Host "El servicio ya corre como $ServiceAccount (usa -ResetPassword para cambiar la contraseña)."
}
Write-Host "El servicio se inicia en el primer despliegue (docs/15 §12)."

Write-Host "`nListo. Siguiente paso: completar $EnvFile y hacer el primer despliegue manual (docs/15 §12)." -ForegroundColor Green
