# Power Pages Security Model

## Web roles (four-tier)

| Web role                 | Audience              | Typical user                                          | Web role ID                                |
| ------------------------ | --------------------- | ----------------------------------------------------- | ------------------------------------------ |
| `ADP Smartsoft Operator` | Smartsoft platform    | Smartsoft staff who manage tenant firms               | `a1adb1a1-0001-4adp-0001-000000000001`     |
| `ADP Firm Admin`         | Firm tenant owner     | Practice owner, firm admin (one or more per firm)     | `a1adb1a1-0004-4adp-0004-000000000004`     |
| `ADP Accountant`         | Firm staff            | Accountant / reviewer assigned to client companies    | `a1adb1a1-0002-4adp-0002-000000000002`     |
| `ADP Client User`        | External client       | Client staff at the customer company                  | `a1adb1a1-0003-4adp-0003-000000000003`     |

Defined in [webrole.yml](../portal-download/smart---site-mgrkm/webrole.yml). Authenticated and Anonymous system roles remain unchanged.

The `ADP Admin` role was renamed to `ADP Smartsoft Operator` to make the platform-vendor surface explicit and to free the word "admin" for the firm-level `ADP Firm Admin`.

## Authentication

Smartsoft tenant is the only identity provider. All firm admins, accountants and client users are provisioned as **Entra ID B2B guests** in the Smartsoft tenant. They sign in to the portal using their work email (any home tenant) and consent once. No per-firm tenants, no local portal passwords.

## Permission matrix (page-level)

| Page              | Operator (OP) | Firm Admin (FA)           | Accountant (AC)             | Client (CL)                    |
| ----------------- | ------------- | ------------------------- | --------------------------- | ------------------------------ |
| `/`               | View          | View                      | View                        | View                           |
| `/dashboard`      | View          | View                      | View                        | View                           |
| `/operator`       | Manage        | —                         | —                           | —                              |
| `/team`           | Read all      | Manage own firm           | —                           | —                              |
| `/clients`        | All firms     | All firm clients          | Assigned clients (read)     | —                              |
| `/launch-tally`   | Any company   | Any firm company          | Assigned companies          | Own company                    |
| `/inbox`          | All           | All firm rows             | Assigned-company rows       | Own-company rows (read)        |
| `/documents`      | All sites     | All firm sites            | Assigned-company site       | Own-company site               |
| `/insights`       | Full          | Full firm scope           | Filtered by RLS             | Filtered by RLS                |
| `/agents`         | Full          | Full                      | Full                        | Client bots only               |
| `/billing`        | All firms     | Own firm                  | Read firm                   | Own subscription               |

Enforced by Liquid checks on `adp_personagroup` plus Power Pages table permissions and Power BI RLS roles (`CompanyRLS`, `FirmRLS`).

## Table permissions

Authored in [security/table-permissions.yml](../security/table-permissions.yml). Scopes are evaluated in this order: Global → Parent (anchor chain) → Account → Self.

| Table                  | Operator        | Firm Admin                        | Accountant                       | Client User                  |
| ---------------------- | --------------- | --------------------------------- | -------------------------------- | ---------------------------- |
| `adp_firm`             | CRUD (Global)   | R+W (Self)                        | Read (Self)                      | —                            |
| `adp_company`          | CRUDap (Global) | CRU+ap (Parent: firm)             | CRU+ap (Account: assigned)       | Read (Account: own)          |
| `adp_appuser`          | CRUD (Global)   | CRU+ap (Parent: firm)             | CRU (Parent: assigned company)   | RU (Self)                    |
| `adp_companyassignment`| CRUD (Global)   | CRUD (Parent: firm)               | Read (Self)                      | —                            |
| `adp_dataingestion`    | CRUD (Global)   | RW (Parent: firm companies)       | CRU (Parent: company)            | Read (Parent: own company)   |
| `adp_tallysession`     | CRUD (Global)   | Read (Parent: firm companies)     | CRU (Parent: company)            | C+R (own company)            |
| `adp_powerbireport`    | CRUD (Global)   | Read (Parent: firm companies)     | CRU (Parent: company)            | Read (Parent: own company)   |
| `adp_auditengagement`  | CRUDap (Global) | Read (Parent: firm companies)     | CRU+ap (Parent: assigned company)| Read (Parent: own company)   |
| `adp_auditlog`         | Read (Global)   | —                                 | Read (Parent: assigned company)  | —                            |
| `adp_config`           | CRUD (Global)   | —                                 | —                                | —                            |

CRUDap = Create, Read, Update, Delete, Append, AppendTo. Firm Admin parent anchor is `ADP Firm Admin - Own Firm` (Self scope on `adp_firm`).

## Dataverse security roles

Created in the solution and assigned to the application user / portal user record:

| Dataverse role        | Privilege scope                                                  |
| --------------------- | ---------------------------------------------------------------- |
| `ADP Smartsoft Op`    | Organization-level for all `adp_*` tables                        |
| `ADP Firm Admin`      | Business-unit (per firm) for `adp_*` tables; no `adp_config`     |
| `ADP Accountant`      | Owner-team for assigned companies                                |
| `ADP Client User`     | User-level, plus read on related `adp_company` rows              |

## Column security

- Enable field security on `adp_company.adp_gstin` and `adp_config.adp_value`.
- Assign the **ADP Sensitive Data** field-security profile only to `ADP Smartsoft Operator` and explicitly approved `ADP Firm Admin` / `ADP Accountant` users.

## RLS in Power BI

Two RLS roles on the shared dataset:

```
FirmRLS:    [FirmId]    = LOOKUPVALUE(AppUser[FirmId], AppUser[UserName], USERNAME())
CompanyRLS: [CompanyId] IN VALUES(CompanyAssignment[CompanyId] FILTER UserName=USERNAME())
```

The Liquid `{% powerbi %}` tag in [pages/reports.liquid](pages/reports.liquid) passes `adp_firmid` and `adp_companyid` so RLS filters automatically.

## Provisioning

### Onboard a firm (Operator → new firm)

1. Operator opens **/operator → Firms → + Onboard firm**.
2. Liquid form creates a Dataverse `adp_firm` row with status `Trial`.
3. `Flow_OnboardFirm` ([flows/Flow_OnboardFirm.json](../flows/Flow_OnboardFirm.json)) fires on the create event and:
   - Creates an Entra security group (`ADP-Firm-<name>`)
   - Creates the firm SharePoint site
   - Creates a Power BI workspace for the firm
   - Flips the firm to `Active`
   - Calls `Flow_InviteUser` to invite the first firm admin.

### Invite a teammate (Firm Admin → user)

1. Firm Admin opens **/team → + Invite teammate**.
2. Form posts to `Flow_InviteUser` ([flows/Flow_InviteUser.json](../flows/Flow_InviteUser.json)) with:
   - `email`, `displayName`
   - `firmId` (the FA's own firm)
   - `jobFunction` = `firmadmin` | `accountant` | `client`
   - `role` = `ADP Firm Admin` | `ADP Accountant` | `ADP Client User`
   - `companyAssignments[]` (required for accountants and clients)
3. The flow:
   - Sends a Graph B2B invitation to the invitee
   - Creates the portal `contact` row
   - Creates the `adp_appuser` row with `adp_status = Pending`
   - Assigns the web role via the `adx_webrole_contact` N:N
   - Creates `adp_companyassignment` rows per the payload
4. First successful sign-in flips `adp_status` to `Active` (handled by [templates/adp-user-context.liquid](templates/adp-user-context.liquid) firing a one-shot promotion call).

### Disable a user (Firm Admin or Operator → user)

1. Open **/team → Active → Disable**.
2. UI posts to `Flow_DisableUser` ([flows/Flow_DisableUser.json](../flows/Flow_DisableUser.json)) which:
   - Sets `adp_status = Disabled` and stamps `adp_disabledon`/`adp_disabledreason`
   - Sets the portal `contact` to inactive and locks local sign-in
   - Calls Graph `revokeSignInSessions` to drop any live tokens
   - Writes an `adp_auditlog` row
3. Records are retained; the user disappears from `/team → Active` and shows under **Disabled**.

## Sample test users

See [security/sample-users.csv](../security/sample-users.csv). Suggested set for QA:

| Role                     | UPN pattern                                  | Scope                       |
| ------------------------ | -------------------------------------------- | --------------------------- |
| ADP Smartsoft Operator   | `op.<name>@smartsoft.onmicrosoft.com`        | All firms                   |
| ADP Firm Admin           | `fa.<firm>@<firm-domain>`                    | Own firm                    |
| ADP Accountant           | `ac.lead@<firm-domain>`                      | Multiple assigned companies |
| ADP Accountant           | `ac.jr@<firm-domain>`                        | Single assigned company     |
| ADP Client User          | `client.acme@<client-domain>`                | Acme Traders Pvt Ltd        |
| ADP Client User          | `client.beta@<client-domain>`                | Beta Industries             |

All non-Smartsoft users are invited as B2B guests — they keep their own home credentials and MFA.
