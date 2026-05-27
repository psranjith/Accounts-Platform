param(
  [Parameter(Mandatory=$true)][string]$TenantId,
  [Parameter(Mandatory=$true)][string]$DevEnvironmentName,
  [Parameter(Mandatory=$true)][string]$TestEnvironmentName,
  [Parameter(Mandatory=$true)][string]$ProdEnvironmentName,
  [Parameter(Mandatory=$true)][string]$Location,
  [Parameter(Mandatory=$true)][string]$Currency,
  [Parameter(Mandatory=$true)][string]$Language,
  [string]$Domain = "adp",
  [string]$PortalSiteName = "Accountant Portal",
  [string]$PortalTemplate = "StarterLayout"
)

$ErrorActionPreference = "Stop"

Write-Host "Authenticating to Power Platform..."
pac auth create --kind ADMIN --tenant $TenantId

Write-Host "Creating environments (dev/test/prod) if needed..."
pac admin create --name $DevEnvironmentName --type Sandbox --region $Location --currency $Currency --language $Language --domain $Domain
pac admin create --name $TestEnvironmentName --type Sandbox --region $Location --currency $Currency --language $Language --domain $Domain
pac admin create --name $ProdEnvironmentName --type Production --region $Location --currency $Currency --language $Language --domain $Domain

Write-Host "Selecting dev environment..."
pac org select --name $DevEnvironmentName

Write-Host "Initializing solution project metadata..."
if (-not (Test-Path "../solution/AccountantDeliveryPlatform.cdsproj")) {
  pac solution init --publisher-name "ADP Publisher" --publisher-prefix adp --outputDirectory ../solution
}

Write-Host "Packing and importing solution to dev..."
pac solution pack --folder ../solution/src --zipfile ../solution/AccountantDeliveryPlatform.zip --packagetype Unmanaged
pac solution import --path ../solution/AccountantDeliveryPlatform.zip --async

Write-Host "Creating Power Pages site scaffold in dev environment..."
pac pages create --name "$PortalSiteName" --use-default-template true

Write-Host "Downloading site source to local portal folder..."
pac pages download --path ../portal --webSiteId "$(pac pages list --json | ConvertFrom-Json | Select-Object -First 1 -ExpandProperty websiteid)"

Write-Host "Initialization complete."
