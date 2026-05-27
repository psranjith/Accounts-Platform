# Provisions the Entra app registration used by the local ADP preview to
# call Microsoft Graph (read SharePoint Smartsoft646 documents) as the
# signed-in user.
#
# Run as:    . .\preview\setup-entra-app.ps1
#
# Uses a manual device-code flow so the user has ~15 minutes to sign in
# (the Graph PowerShell SDK's built-in flow times out after 120 seconds).

[CmdletBinding()]
param(
    [string] $DisplayName = 'ADP Local Preview',
    [string] $RedirectUri = 'http://127.0.0.1:5500/preview/',
    [string] $TenantId    = '0f14fddf-7d9e-48f3-93b2-9a1d537673f5'
)

$ErrorActionPreference = 'Stop'

function Step($msg) {
    Write-Host ""
    Write-Host "==> $msg" -ForegroundColor Cyan
}

# Public client used only to acquire a delegated Graph token via device flow.
# This is the well-known Microsoft Graph PowerShell first-party client.
$bootstrapClientId = '14d82eec-204b-4c2f-b7e8-296a70dab67e'

$scopesNeeded = @(
    'Application.ReadWrite.All',
    'DelegatedPermissionGrant.ReadWrite.All',
    'AppRoleAssignment.ReadWrite.All',
    'Directory.ReadWrite.All',
    'offline_access'
)

Step "Requesting device code from Entra..."
$deviceResp = Invoke-RestMethod -Method POST `
    -Uri "https://login.microsoftonline.com/$TenantId/oauth2/v2.0/devicecode" `
    -ContentType 'application/x-www-form-urlencoded' `
    -Body @{
        client_id = $bootstrapClientId
        scope     = ($scopesNeeded -join ' ')
    }

Write-Host ""
Write-Host "============================================================" -ForegroundColor Yellow
Write-Host " Open: $($deviceResp.verification_uri)" -ForegroundColor Yellow
Write-Host " Code: $($deviceResp.user_code)"        -ForegroundColor Yellow
Write-Host " Sign in as: ranjith@smartsoft.co.in"    -ForegroundColor Yellow
Write-Host " You have $([int]($deviceResp.expires_in / 60)) minutes." -ForegroundColor Yellow
Write-Host "============================================================" -ForegroundColor Yellow
Write-Host ""

Step "Waiting for sign-in..."
$expiresAt = (Get-Date).AddSeconds($deviceResp.expires_in)
$interval  = [int]$deviceResp.interval
if ($interval -lt 5) { $interval = 5 }

$tokenResp = $null
while ((Get-Date) -lt $expiresAt) {
    Start-Sleep -Seconds $interval
    try {
        $tokenResp = Invoke-RestMethod -Method POST `
            -Uri "https://login.microsoftonline.com/$TenantId/oauth2/v2.0/token" `
            -ContentType 'application/x-www-form-urlencoded' `
            -Body @{
                grant_type  = 'urn:ietf:params:oauth:grant-type:device_code'
                client_id   = $bootstrapClientId
                device_code = $deviceResp.device_code
            }
        break
    } catch {
        $errBody = $null
        try { $errBody = $_.ErrorDetails.Message | ConvertFrom-Json } catch {}
        if ($errBody -and $errBody.error -eq 'authorization_pending') {
            Write-Host "    still waiting..." -ForegroundColor DarkGray
            continue
        }
        if ($errBody -and $errBody.error -eq 'slow_down') {
            $interval += 5
            continue
        }
        throw "Device flow failed: $($errBody.error) - $($errBody.error_description)"
    }
}
if (-not $tokenResp) { throw "Device code expired before sign-in completed." }

Write-Host "    Signed in." -ForegroundColor Green
$accessToken = $tokenResp.access_token
$authHeader  = @{ Authorization = "Bearer $accessToken"; 'Content-Type' = 'application/json' }
$graphBase   = 'https://graph.microsoft.com/v1.0'

# Identify the signed-in user.
$me = Invoke-RestMethod -Method GET -Headers $authHeader -Uri "$graphBase/me"
Write-Host "    Signed-in user: $($me.userPrincipalName)" -ForegroundColor Green

# --- Microsoft Graph delegated permission scope IDs (constant) ---------------
$graphAppId = '00000003-0000-0000-c000-000000000000'
$scopeIds = [ordered]@{
    'User.Read'       = 'e1fe6dd8-ba31-4d61-89e7-88639da4683d'
    'Sites.Read.All'  = '205e70e5-aba6-4c52-a976-6d2d46c48043'
    'Files.Read.All'  = 'df85f4d6-205c-4ac5-a5ea-6bf408dba283'
}

# --- Power Platform API ('CopilotStudio.Copilots.Invoke') --------------------
# Looked up dynamically because the scope GUID can vary across clouds; this
# lets the preview's Smart Agent page invoke a Copilot Studio agent on behalf
# of the signed-in user via the DirectToEngine API.
$powerPlatformAppId = '8578e004-a5c6-46e7-913e-12f58912df43'
Step "Looking up Power Platform API service principal..."
$ppLookup = Invoke-RestMethod -Method GET -Headers $authHeader `
    -Uri "$graphBase/servicePrincipals?`$filter=appId eq '$powerPlatformAppId'"
$copilotScopeId = $null
if ($ppLookup.value.Count -eq 0) {
    Write-Host "    Power Platform API service principal not found in tenant." -ForegroundColor Yellow
    Write-Host "    Smart Agent embedding will be skipped. (Run 'Get-MgServicePrincipal -Filter \"appId eq ''$powerPlatformAppId''\"' or visit https://make.powerapps.com once to provision.)" -ForegroundColor Yellow
} else {
    $ppSp = $ppLookup.value[0]
    $copilotScope = $ppSp.oauth2PermissionScopes | Where-Object { $_.value -eq 'CopilotStudio.Copilots.Invoke' }
    if ($copilotScope) {
        $copilotScopeId = $copilotScope.id
        Write-Host "    Found scope CopilotStudio.Copilots.Invoke ($copilotScopeId)" -ForegroundColor Green
    } else {
        Write-Host "    Scope 'CopilotStudio.Copilots.Invoke' not exposed by this tenant's Power Platform API SP." -ForegroundColor Yellow
    }
}

$requiredAccess = @(
    @{
        resourceAppId  = $graphAppId
        resourceAccess = @($scopeIds.GetEnumerator() | ForEach-Object {
            @{ id = $_.Value; type = 'Scope' }
        })
    }
)
if ($copilotScopeId) {
    $requiredAccess += @{
        resourceAppId  = $powerPlatformAppId
        resourceAccess = @(@{ id = $copilotScopeId; type = 'Scope' })
    }
}

# --- Find or create the application ------------------------------------------
Step "Looking up app '$DisplayName'..."
$escaped = $DisplayName.Replace("'", "''")
$found = Invoke-RestMethod -Method GET -Headers $authHeader `
    -Uri "$graphBase/applications?`$filter=displayName eq '$escaped'"

if ($found.value.Count -gt 0) {
    $app = $found.value[0]
    Write-Host "    Found app (AppId $($app.appId))" -ForegroundColor Yellow

    Step "Updating SPA redirect URI and required permissions..."
    $patchBody = @{
        spa                    = @{ redirectUris = @($RedirectUri) }
        requiredResourceAccess = $requiredAccess
        signInAudience         = 'AzureADMyOrg'
    } | ConvertTo-Json -Depth 10
    Invoke-RestMethod -Method PATCH -Headers $authHeader `
        -Uri "$graphBase/applications/$($app.id)" -Body $patchBody | Out-Null
    Write-Host "    Updated."
} else {
    Step "Creating new app registration..."
    $createBody = @{
        displayName            = $DisplayName
        signInAudience         = 'AzureADMyOrg'
        spa                    = @{ redirectUris = @($RedirectUri) }
        requiredResourceAccess = $requiredAccess
    } | ConvertTo-Json -Depth 10
    $app = Invoke-RestMethod -Method POST -Headers $authHeader `
        -Uri "$graphBase/applications" -Body $createBody
    Write-Host "    Created (AppId $($app.appId))" -ForegroundColor Green
}

# --- Ensure service principal exists -----------------------------------------
Step "Ensuring service principal exists..."
$spLookup = Invoke-RestMethod -Method GET -Headers $authHeader `
    -Uri "$graphBase/servicePrincipals?`$filter=appId eq '$($app.appId)'"
if ($spLookup.value.Count -eq 0) {
    $sp = Invoke-RestMethod -Method POST -Headers $authHeader `
        -Uri "$graphBase/servicePrincipals" `
        -Body (@{ appId = $app.appId } | ConvertTo-Json)
    Write-Host "    Created service principal." -ForegroundColor Green
} else {
    $sp = $spLookup.value[0]
    Write-Host "    Service principal exists ($($sp.id))." -ForegroundColor Yellow
}

# --- Resolve Microsoft Graph SP in this tenant -------------------------------
Step "Locating Microsoft Graph service principal..."
$graphSpLookup = Invoke-RestMethod -Method GET -Headers $authHeader `
    -Uri "$graphBase/servicePrincipals?`$filter=appId eq '$graphAppId'"
$graphSp = $graphSpLookup.value[0]
Write-Host "    Graph SP id: $($graphSp.id)"

# --- Tenant-wide admin consent ------------------------------------------------
function Grant-TenantWideConsent($clientSpId, $resourceSpId, $scopeString, $label) {
    $grantLookup = Invoke-RestMethod -Method GET -Headers $authHeader `
        -Uri "$graphBase/oauth2PermissionGrants?`$filter=clientId eq '$clientSpId' and consentType eq 'AllPrincipals' and resourceId eq '$resourceSpId'"
    if ($grantLookup.value.Count -gt 0) {
        $grantId = $grantLookup.value[0].id
        $patch = @{ scope = $scopeString } | ConvertTo-Json
        Invoke-RestMethod -Method PATCH -Headers $authHeader `
            -Uri "$graphBase/oauth2PermissionGrants/$grantId" -Body $patch | Out-Null
        Write-Host "    Updated $label consent: $scopeString" -ForegroundColor Green
    } else {
        $grantBody = @{
            clientId    = $clientSpId
            consentType = 'AllPrincipals'
            resourceId  = $resourceSpId
            scope       = $scopeString
        } | ConvertTo-Json
        Invoke-RestMethod -Method POST -Headers $authHeader `
            -Uri "$graphBase/oauth2PermissionGrants" -Body $grantBody | Out-Null
        Write-Host "    Created $label consent: $scopeString" -ForegroundColor Green
    }
}

Step "Granting tenant-wide admin consent (Microsoft Graph)..."
Grant-TenantWideConsent $sp.id $graphSp.id (($scopeIds.Keys) -join ' ') 'Microsoft Graph'

if ($copilotScopeId) {
    Step "Granting tenant-wide admin consent (Power Platform API)..."
    Grant-TenantWideConsent $sp.id $ppSp.id 'CopilotStudio.Copilots.Invoke' 'Power Platform API'
}

# --- Write preview/auth-config.js --------------------------------------------
Step "Writing preview/auth-config.js..."
$configPath = Join-Path $PSScriptRoot 'auth-config.js'
$copilotBlock = if ($copilotScopeId) {
@"
  copilot: {
    // DirectToEngine 'conversations' URL of the Copilot Studio agent.
    // POST here with a Power Platform delegated bearer token to obtain a
    // DirectLine token + streamUrl that botframework-webchat can consume.
    conversationsUrl: 'https://default0f14fddf7d9e48f393b29a1d537673.f5.environment.api.powerplatform.com/copilotstudio/dataverse-backed/authenticated/bots/crdb4_techComparison/conversations?api-version=2022-03-01-preview',
    title: 'Quote Preparation',
    scopes: ['https://api.powerplatform.com/CopilotStudio.Copilots.Invoke']
  },
"@
} else { '' }

$configBody = @"
// Generated by preview/setup-entra-app.ps1 on $(Get-Date -Format o)
// Safe to commit: contains tenant + public client id only (no secrets).
window.ADP_AUTH = {
  clientId: '$($app.appId)',
  tenantId: '$TenantId',
  redirectUri: '$RedirectUri',
  sharePoint: {
    hostname: 'intelliblend.sharepoint.com',
    sitePath: '/sites/Smartsoft646',
    libraryName: 'Documents'
  },
$copilotBlock  scopes: ['User.Read', 'Sites.Read.All', 'Files.Read.All']
};
"@
Set-Content -Path $configPath -Value $configBody -Encoding UTF8
Write-Host "    Wrote $configPath" -ForegroundColor Green

Write-Host ""
Write-Host "===== DONE =====" -ForegroundColor Cyan
Write-Host "Client ID : $($app.appId)"
Write-Host "Tenant ID : $TenantId"
Write-Host "Redirect  : $RedirectUri"
Write-Host ""
Write-Host "Reload http://127.0.0.1:5500/preview/?page=documents and click 'Sign in'."
