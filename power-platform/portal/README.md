# Power Pages Site Scaffold

Site name: Accountant Portal
Template target: Dataverse starter

## Create site with PAC CLI
Depending on installed PAC version, use one of the following:

1. Direct PAC create path
- `pac pages create --name "Accountant Portal" --use-default-template true`

2. If template selection is not exposed in your PAC version
- Create the site once in Power Pages Studio with Dataverse starter template.
- Then pull source with:
  - `pac pages download --path ./portal --webSiteId <website-id>`

## Authentication (Entra ID only)
1. Portal Management > Set Authentication/Identity Provider settings.
2. Enable only Entra ID provider.
3. Disable local and social providers.
4. Configure client ID, client secret/cert, authority and redirect URI.

## Included pages and templates
- pages/index.liquid
- pages/dashboard.liquid
- pages/companies.liquid
- pages/documents.liquid
- pages/reports.liquid
- pages/assistant.liquid
- pages/inbox.liquid
- pages/launch-tally.liquid
- templates/adp-user-context.liquid

## Post-import checklist
- Rebind each Liquid page to a Power Pages Web Page record.
- Create corresponding site markers and navigation links.
- Create Web Roles: ADP Admin, ADP Accountant, ADP Client User.
- Apply table permissions per portal/security-model.md.
- Configure Power BI component on /reports and Copilot Studio embed on /assistant.
- Configure SharePoint integration component on /documents.
