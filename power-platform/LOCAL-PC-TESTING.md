# Local PC Setup and Testing Guide (Windows)

This guide is for developers/testers who need to run and validate the Accountant Delivery Platform scaffold from a local machine before pushing changes to shared environments.

## Scope
- Setup local tooling (Power Platform CLI, VS Code extension, PowerShell, Azure Functions Core Tools).
- Connect to your Power Platform development environment.
- Pull/push solution and portal source.
- Run minimal custom RDP function locally.
- Execute a practical smoke test checklist.

## 1. Local prerequisites
Install the following on your Windows PC:

1. PowerShell 7+
- Verify:
  - `pwsh -v`

2. Node.js 18+ (required for Azure Function project)
- Verify:
  - `node -v`
  - `npm -v`

3. .NET SDK 8+ (recommended for tooling compatibility)
- Verify:
  - `dotnet --version`

4. Power Platform CLI
- Verify:
  - `pac help`

5. Azure Functions Core Tools v4
- Verify:
  - `func --version`

6. VS Code extension: Power Platform Tools
- Open VS Code extensions and install Microsoft Power Platform Tools.

## 2. Clone/open repository
From PowerShell:

```powershell
cd C:\
# Use your own clone path if already cloned
git clone <your-repo-url> "Accounts Delivery Platform New"
cd "Accounts Delivery Platform New"
```

## 3. Authenticate PAC CLI
Use an admin identity with environment maker permissions:

```powershell
pac auth create --kind ADMIN --tenant <tenant-id>
pac auth list
```

Select your profile if needed:

```powershell
pac auth select --index 1
```

## 4. Initialize or connect environments
If environments are not created yet, run:

```powershell
cd .\power-platform\scripts
pwsh .\init.ps1 `
  -TenantId <tenant-id> `
  -DevEnvironmentName <dev-env-name> `
  -TestEnvironmentName <test-env-name> `
  -ProdEnvironmentName <prod-env-name> `
  -Location <region> `
  -Currency INR `
  -Language 1033
```

If environments already exist, skip init and just select the org:

```powershell
pac org select --name <dev-env-name>
pac org who
```

## 5. Pull latest solution + portal source locally

```powershell
cd .\power-platform\scripts
pwsh .\pull.ps1 -EnvironmentName <dev-env-name> -WebsiteId <power-pages-website-id>
```

Expected result:
- Solution unpacked into power-platform/solution/src
- Power Pages source downloaded into power-platform/portal

## 6. Configure deployment settings for local testing
Create a local copy of deployment settings:

```powershell
cd ..
Copy-Item .\deployment-settings.template.json .\deployment-settings.local.json
```

Edit deployment-settings.local.json and replace placeholders:
- Environment variables (API URLs, mailbox, model id)
- Secure values (function keys, tokens)
- Connection reference IDs

Important:
- Do not commit deployment-settings.local.json with real secrets.
- Prefer Key Vault for production-grade secret handling.

## 7. Run the minimal custom RDP function locally

```powershell
cd ..\apps\rdp-function
npm install
Copy-Item .\local.settings.json.sample .\local.settings.json
```

Edit local.settings.json values:
- RDP_GATEWAY_HOST
- RDP_SESSION_HOST
- RDP_SIGNING_SECRET
- RDP_TOKEN_TTL_SECONDS

Start function host:

```powershell
func start
```

Test endpoint in a new terminal:

```powershell
curl "http://localhost:7071/api/rdp/generate?companyId=11111111-1111-1111-1111-111111111111"
```

Expected response:
- JSON payload with rdpDownloadUrl, sessionHost, inlineRdp.

## 8. Push local source to dev environment
After editing solution/portal content:

```powershell
cd ..\..\power-platform\scripts
pwsh .\push.ps1 -EnvironmentName <dev-env-name> -WebsiteId <power-pages-website-id>
```

## 9. Local testing checklist
Use this sequence for every local test cycle:

1. Dataverse model check
- Confirm tables exist: adp_company, adp_appuser, adp_entitlement, adp_tallysession, adp_dataingestion, adp_auditlog, adp_config.
- Confirm secured columns (GSTIN, storage access key/config value) are protected.

2. Security check
- Confirm roles exist: ADP Admin, ADP Accountant, ADP Client User.
- Confirm table permissions in portal map correctly to roles.
- Verify a client user only sees own company and related rows.

3. Portal page check
- Validate pages load: /, /dashboard, /companies, /documents, /reports, /assistant, /inbox, /launch-tally.
- Validate Entra ID is the only identity provider enabled.

4. Flow trigger check
- Onboard flow: creating adp_company triggers provisioning sequence.
- Invite flow: HTTP call creates B2B invite + adp_appuser row.
- Launch flow: entitlement validation + RDP function call + adp_tallysession record.
- Ingestion flows: test email/WhatsApp/Telegram input path to adp_dataingestion.

5. Reporting check
- Confirm Power BI component on /reports loads with company filter/RLS behavior.

6. Smart agent check
- Confirm Copilot Studio embed is visible on /assistant.
- Confirm companyId variable is passed and honored.

## 10. Recommended test data set
Create at least:
- 1 accountant user
- 2 client companies
- 2 client users (one per company)
- Entitlements where one company has Tally enabled and the other disabled

This allows quick positive/negative verification of row-level and feature-level access.

## 11. Troubleshooting quick fixes
1. PAC command not found
- Restart terminal after installation.
- Reinstall PAC and verify PATH.

2. pac pages download/upload fails
- Ensure correct WebsiteId.
- Ensure selected environment is correct via pac org who.

3. Flow HTTP trigger returns unauthorized
- Recopy trigger URL.
- Validate run-only permissions and connector auth.

4. Function returns 500
- Check local.settings.json keys.
- Confirm RDP_SIGNING_SECRET is set.

5. Portal login loops/fails
- Recheck Entra app redirect URI and portal authentication config.

## 12. What to commit from local testing
Commit:
- power-platform/solution/src updates
- power-platform/portal updates
- power-platform/flows JSON updates
- docs/scripts changes

Do not commit:
- local.settings.json
- deployment-settings.local.json
- any file with live secrets/tokens

## 13. Suggested daily workflow
1. Pull latest source from Git.
2. Run pull.ps1 from dev.
3. Implement changes.
4. Validate with local checklist.
5. Run push.ps1.
6. Commit and open PR.
