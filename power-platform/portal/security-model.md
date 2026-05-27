# Power Pages Security Model

## Web roles (three-tier)

| Web role          | Audience               | Typical user                              | Web role ID                                |
| ----------------- | ---------------------- | ----------------------------------------- | ------------------------------------------ |
| `ADP Admin`       | Internal tenant owner  | Practice owner, platform admin            | `a1adb1a1-0001-4adp-0001-000000000001`     |
| `ADP Accountant`  | Internal staff         | Accountant / reviewer assigned to clients | `a1adb1a1-0002-4adp-0002-000000000002`     |
| `ADP Client User` | External client        | Client staff at the customer company      | `a1adb1a1-0003-4adp-0003-000000000003`     |

Defined in [webrole.yml](../portal-download/smart---site-mgrkm/webrole.yml). Authenticated and Anonymous system roles remain unchanged.

## Permission matrix (page-level)

| Page              | ADP Admin   | ADP Accountant              | ADP Client User                |
| ----------------- | ----------- | --------------------------- | ------------------------------ |
| `/` (home)        | View        | View                        | View                           |
| `/dashboard`      | View        | View                        | View                           |
| `/companies`      | Manage      | Onboard + edit assigned     | Hidden                         |
| `/launch-tally`   | Any company | Assigned companies          | Own company                    |
| `/inbox`          | All rows    | Rows for assigned companies | Own-company rows (read)        |
| `/documents`      | All sites   | Site for assigned company   | Site for own company           |
| `/reports`        | Full        | Filtered by RLS role        | Filtered by RLS role           |
| `/assistant`      | Full        | Full                        | Full (company context only)    |

Enforced by Liquid checks on `adp_role` plus Power Pages table permissions and Power BI RLS role `CompanyRLS`.

## Table permissions

Authored in [security/table-permissions.yml](../security/table-permissions.yml). Summary:

| Table              | ADP Admin       | ADP Accountant                  | ADP Client User              |
| ------------------ | --------------- | ------------------------------- | ---------------------------- |
| `adp_company`      | CRUDap (Global) | CRU + append (Account scope)    | Read (Account scope)         |
| `adp_appuser`      | CRUD (Global)   | CRU (Parent: assigned company)  | RU on Self                   |
| `adp_dataingestion`| CRUD (Global)   | CRU (Parent: company)           | Read (Parent: own company)   |
| `adp_tallysession` | CRUD (Global)   | CRU (Parent: company)           | Create + Read (own company)  |
| `adp_powerbireport`| CRUD (Global)   | CRU (Parent: company)           | Read (Parent: own company)   |
| `adp_auditlog`     | Read (Global)   | -                               | -                            |
| `adp_config`       | CRUD (Global)   | -                               | -                            |

CRUDap = Create, Read, Update, Delete, Append, AppendTo.

## Dataverse security roles

Created in the solution and assigned to the user record (not the contact):

| Dataverse role            | Privilege scope                                        |
| ------------------------- | ------------------------------------------------------ |
| `ADP Admin`               | Organization-level for all `adp_*` tables              |
| `ADP Accountant`          | Business unit / owner-team for assigned companies      |
| `ADP Client User`         | User-level, plus read on related `adp_company` rows    |

## Column security

- Enable field security on `adp_company.adp_gstin` and `adp_config.adp_value`.
- Assign the **ADP Sensitive Data** field-security profile only to `ADP Admin` and explicitly approved `ADP Accountant` users.

## RLS in Power BI

Define a role `CompanyRLS` in the Power BI dataset:

```
[CompanyId] = USERNAME()
```

The Liquid `{% powerbi %}` tag in [pages/reports.liquid](pages/reports.liquid) passes `adp_companyid` as the `username:` value so RLS filters automatically.

## Provisioning a user

1. Create the Entra ID user in Microsoft 365 admin centre.
2. Run `Flow_InviteUser` ([flows/Flow_InviteUser.json](../flows/Flow_InviteUser.json)) with:
   - `entraObjectId`
   - `companyId` (omit for ADP Admin)
   - `role` = `ADP Admin` | `ADP Accountant` | `ADP Client User`
3. The flow creates the `adp_appuser` row, links it to the company, creates the matching portal contact, and assigns the corresponding web role.
4. Confirm by signing in and checking the badge in [templates/adp-user-context.liquid](templates/adp-user-context.liquid).

## Sample test users

See [security/sample-users.csv](../security/sample-users.csv). Suggested set for QA:

| Role            | UPN pattern                                  | Scope                       |
| --------------- | -------------------------------------------- | --------------------------- |
| ADP Admin       | `admin@<tenant>.onmicrosoft.com`             | All companies               |
| ADP Accountant  | `accountant.lead@<tenant>.onmicrosoft.com`   | Multiple assigned companies |
| ADP Accountant  | `accountant.jr@<tenant>.onmicrosoft.com`     | Single assigned company     |
| ADP Client User | `client.acme@<client-domain>`                | Acme Traders Pvt Ltd        |
| ADP Client User | `client.beta@<client-domain>`                | Beta Industries             |

Do not commit real passwords. Use the M365 admin centre to set temporary passwords and force change on first login.

