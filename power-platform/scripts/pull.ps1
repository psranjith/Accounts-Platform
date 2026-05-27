param(
  [Parameter(Mandatory=$true)][string]$EnvironmentName,
  [Parameter(Mandatory=$false)][string]$WebsiteId
)

$ErrorActionPreference = "Stop"

pac org select --environment $EnvironmentName

Write-Host "Exporting unmanaged solution from $EnvironmentName..."
pac solution export --name AccountantDeliveryPlatform --path ../solution/AccountantDeliveryPlatform.zip --managed false --async

Write-Host "Unpacking solution into source..."
if (Test-Path "../solution/src") {
  Remove-Item "../solution/src" -Recurse -Force
}
New-Item -ItemType Directory -Path "../solution/src" | Out-Null
pac solution unpack --zipfile ../solution/AccountantDeliveryPlatform.zip --folder ../solution/src --packagetype Unmanaged --allowDelete true

if ([string]::IsNullOrWhiteSpace($WebsiteId)) {
  $site = pac pages list --json | ConvertFrom-Json | Where-Object { $_.name -eq "Accountant Portal" } | Select-Object -First 1
  $WebsiteId = $site.websiteid
}

Write-Host "Downloading Power Pages site source..."
pac pages download --path ../portal --webSiteId $WebsiteId --overwrite true

Write-Host "Pull completed."
