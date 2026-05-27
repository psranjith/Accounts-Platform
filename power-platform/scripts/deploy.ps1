param(
  [Parameter(Mandatory=$true)][string]$FromEnvironment,
  [Parameter(Mandatory=$true)][string]$ToEnvironment
)

$ErrorActionPreference = "Stop"

pac org select --name $FromEnvironment
pac solution export --name AccountantDeliveryPlatform --path ../solution/AccountantDeliveryPlatform_managed.zip --managed true --async

pac org select --name $ToEnvironment
pac solution import --path ../solution/AccountantDeliveryPlatform_managed.zip --async

Write-Host "Deployment from $FromEnvironment to $ToEnvironment complete."
