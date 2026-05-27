param(
  [Parameter(Mandatory=$true)][string]$EnvironmentName,
  [Parameter(Mandatory=$true)][string]$WebsiteId
)

$ErrorActionPreference = "Stop"

pac org select --environment $EnvironmentName

Write-Host "Packing solution from source..."
pac solution pack --folder ../solution/src --zipfile ../solution/AccountantDeliveryPlatform.zip --packagetype Unmanaged

Write-Host "Importing solution to $EnvironmentName..."
pac solution import --path ../solution/AccountantDeliveryPlatform.zip --async

Write-Host "Uploading Power Pages source..."
pac pages upload --path ../portal --modelVersion 2

Write-Host "Push completed."
