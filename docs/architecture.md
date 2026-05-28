# ADP Portal — Architecture

Smart Accounting Reports / **Accounts Delivery Platform (ADP)** is a multi-tenant audit & accounting delivery portal for CA firms. It is built on the **Microsoft Power Platform** (Power Pages + Dataverse + Power Automate + Power BI + Copilot Studio) plus one custom Azure Function for the Tally RDP gateway. There is no React SPA, no custom Node API surface, and no third-party auth — everything authenticates through Entra ID.

This document is the canonical layer map. For per-page details see [usability.md](usability.md); for role x page capabilities see [page-role-matrix.md](page-role-matrix.md); for the local simulator see [preview-harness.md](preview-harness.md).

---

## 1. Layer map

```
                       ┌────────────────────────────────────┐
                       │      Entra ID (sole IdP)           │
                       │  • Internal members (firm/op)      │
                       │  • B2B guests (client users)       │
                       └─────────────────┬──────────────────┘
                                         │ OAuth
                                         ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      Power Pages portal (Liquid)                       │
│  25 pages under power-platform/portal/pages/  +  3 shared shell        │
│  templates (adp-shell-open, adp-shell-close, adp-user-context).        │
│  Persona-aware navigation, FetchXML data binding, Liquid gating.       │
└──────┬───────────────┬──────────────┬───────────────┬──────────────────┘
       │ FetchXML       │ entityform   │ powerbi tag   │ <iframe> (chat)
       ▼                ▼              ▼               ▼
┌──────────────┐  ┌─────────────┐  ┌──────────┐  ┌──────────────┐
│  Dataverse   │  │ Power Pages │  │ Power BI │  │ Copilot      │
│  ~13 adp_*   │  │ Forms /     │  │ Embedded │  │ Studio bots  │
│  tables      │  │ Entity lists│  │ + RLS    │  │ + MS built-in│
└──────┬───────┘  └─────────────┘  └──────────┘  └──────────────┘
       │
       │ triggers (create/update/delete, schedule)
       ▼
┌────────────────────────────────────────────────────────────────────────┐
│                Power Automate (13 cloud flows)                         │
│  Onboard · Invite · LaunchTally · IngestEmail/WhatsApp/Telegram ·      │
│  StartAuditEngagement · RunExceptionEngine (cron 03:00) ·              │
│  SubmitForReview · SignOff · GenerateAuditReport ·                     │
│  AuditLogTrigger · ManageSubscription                                  │
└──────┬─────────────────────────────────────────────────────────────────┘
       │ HTTP / Graph / Dataverse SDK / Power Query
       ▼
┌──────────────┬─────────────────┬───────────────┬──────────────────────┐
│ SharePoint   │ Azure Function  │ Tally RDS     │ External channels    │
│ (documents,  │ (apps/rdp-      │ gateway       │ Email / Telegram /   │
│  audit       │  function/)     │ (signed .rdp) │ WhatsApp via custom  │
│  evidence)   │                 │               │ connectors           │
└──────────────┴─────────────────┴───────────────┴──────────────────────┘
```

| # | Layer | Source folder | Notes |
|---|---|---|---|
| 1 | **Power Pages portal** | [power-platform/portal/](../power-platform/portal/) | 25 `.liquid` pages, 3 shell templates, theme JSON, FetchXML snippets. Every page includes `adp-shell-open`/`close` so navigation is identical across the surface. |
| 2 | **Dataverse** | [power-platform/solution/](../power-platform/solution/) | ~13 `adp_*` tables (see §3). Source of truth. |
| 3 | **Power Automate flows** | [power-platform/flows/](../power-platform/flows/) | 13 cloud flows. Business logic lives here, not in client code. |
| 4 | **Power Query (M)** | [power-platform/power-query/](../power-platform/power-query/) | `audit-exceptions.pq` unifies Tally / Bank / GST / Payroll and evaluates 16 rules → writes `adp_exception`. |
| 5 | **Catalog (JSON)** | [power-platform/catalog/](../power-platform/catalog/) | Bundles (5 plans), 4 audit programs, 56 procedures, 16 exception rules, per-company Power BI registry. Static config, not user data. |
| 6 | **Azure Function** | [apps/rdp-function/](../apps/rdp-function/) | The **only** custom code. Two endpoints: `RdpGenerate` signs a token, `RdpFile` returns a short-lived `.rdp` for the Tally RDS gateway. |
| 7 | **Power BI** | embed on [insights.liquid](../power-platform/portal/pages/insights.liquid) | Workspace + report IDs from `catalog/powerbi-reports.json`. Row-level security role `CompanyRLS` (`[CompanyId] = USERNAME()`). |
| 8 | **Copilot Studio** | surfaced on [agents.liquid](../power-platform/portal/pages/agents.liquid) | Custom firm bots + Microsoft built-ins (M365 Copilot, Researcher, Analyst, Idea Coach). |
| 9 | **Auth** | Entra ID only | B2B guests for external client users; internal members for firm staff and Smartsoft operators. |
| 10 | **Preview harness** | [preview/](../preview/) | Static LiquidJS simulator for offline iteration. Not deployed. See [preview-harness.md](preview-harness.md). |

---

## 2. Personas, web roles, scope

| Persona (UI label) | `adp_personagroup` | Power Pages web role | Data scope |
|---|---|---|---|
| Smartsoft Operator | `operator` | *platform* (Smartsoft tenant) | All firms — cross-tenant operations |
| Firm Admin | `firmadmin` | ADP Admin | All client companies of one firm |
| Accountant | `accountant` | ADP Accountant | Only companies assigned via `adp_companyassignment` |
| Client | `client` | ADP Client User | Own `adp_companyid` only (mostly read) |

**Enforcement is layered** so a defect in any one layer does not breach data:

1. **Liquid UI gating** — `{% if adp_personagroup == 'firmadmin' %}` hides controls.
2. **FetchXML filters** — pages inject `<filter><condition attribute="adp_companyid" operator="eq" value="{{ adp_companyid }}"/></filter>` or `<link-entity name="adp_auditengagement">...</link-entity>` to scope rows.
3. **Power Pages table permissions** — declared in [power-platform/security/table-permissions.yml](../power-platform/security/table-permissions.yml). Server-side, defence-in-depth.
4. **Power BI RLS** — `CompanyRLS` role on the dataset.

Persona derivation lives in [adp-user-context.liquid](../power-platform/portal/templates/adp-user-context.liquid): it reads `adp_role` from `adp_appuser` and downcase-maps to one of the four `adp_personagroup` values.

---

## 3. Data model (Dataverse tables)

| Table | Purpose | Key fields |
|---|---|---|
| `adp_company` | Client company master | name, GSTIN, PAN, primary contact, firm reference |
| `adp_appuser` | Portal user (linked to Entra OID) | `identity_provider_object_id`, `adp_role`, `adp_companyid` |
| `adp_companyassignment` | Accountant ↔ company mapping | `adp_staffid`, `adp_companyid` |
| `adp_entitlement` | Active bundle per company | `adp_bundlecode`, periodstart/end |
| `adp_auditengagement` | One audit per (company, program, period) | `adp_programcode`, `adp_periodfrom/to`, `adp_status`, materiality, lead partner/manager |
| `adp_workpaper` | Procedure execution record | `adp_auditengagementid`, `adp_procedurecode`, status, preparer, sample size/method, conclusion |
| `adp_procedure` | Catalog of test steps | sourced from `catalog/audit-procedures.json` |
| `adp_exception` | Rule-engine finding | `adp_rulecode`, source, severity, amount, status, linked workpaper |
| `adp_clientrequest` | PBC (provided-by-client) item | engagement, item, due date, status, assignee, evidence URL |
| `adp_review` | Reviewer sign-off | level (Manager/Partner), decision, comments, signed-on |
| `adp_auditlog` | Immutable change log | action, entity, actor, timestamp, summary — populated by `Flow_AuditLogTrigger` |
| `adp_dataingestion` | Inbound document (email/WhatsApp/Telegram) | channel, sender, attachment URL, classification, company link |
| `adp_tallysession` | RDP session bookkeeping | company, user, signed-token JTI, expiry |
| `adp_config` | Per-tenant feature flags | k/v |

ERD essentials: `adp_company` is the tenancy anchor — almost every other entity is scoped via direct lookup or via `adp_auditengagement` (which itself holds `adp_companyid`). The Audit page's `<link-entity name="adp_auditengagement">` filters on child entities exist precisely because workpaper/exception/clientrequest don't carry `adp_companyid` directly.

---

## 4. End-to-end audit pipeline

```
 INGEST                      CLASSIFY                START                FIELDWORK
 ──────                      ────────                ─────                ─────────
 Email   ─┐                                                              ┌─ adp_workpaper
 Telegram ├─► adp_data    ─► AI Builder /     ─► Flow_StartAudit   ────► ├─ samples
 WhatsApp ┘   ingestion       Doc Intelligence    Engagement              │  + evidence
                                                  • seeds workpapers     │  (Tally / Bank
                                                  • seeds PBC requests   │   / GST / SP)
                                                                          ▼
 EXCEPTION ENGINE                  REVIEW                       REPORT
 ────────────────                  ──────                       ──────
 Daily 03:00 + manual              Preparer → Manager →         Word template
 audit-exceptions.pq               Partner sign-off             → PDF
 (16 rules)                        (adp_review, SHA256)         → SharePoint
   │                                       │                          │
   ▼                                       ▼                          ▼
 adp_exception                     adp_auditengagement.        adp_auditengagement.
                                   status = Reviewed           status = Issued

 EVERY step writes to adp_auditlog via Flow_AuditLogTrigger (Dataverse trigger).
```

| Stage | Flow / Component | Output |
|---|---|---|
| Ingest | `Flow_IngestEmail`, `Flow_IngestTelegram`, `Flow_IngestWhatsApp` | `adp_dataingestion` row + SharePoint attachment |
| Classify | AI Builder + Doc Intelligence (inline in ingest flows) | classification tag + company link |
| Start | `Flow_StartAuditEngagement` | Engagement + seeded workpapers + PBC list |
| Fieldwork | Portal pages (workpaper.liquid) + Tally RDP via `apps/rdp-function/` | Evidence, samples, conclusions |
| Exception engine | `Flow_RunExceptionEngine` (cron) → invokes `audit-exceptions.pq` | `adp_exception` rows |
| Submit | `Flow_SubmitForReview` | Status transition + notification |
| Sign-off | `Flow_SignOff` | `adp_review` with SHA256 of payload (immutable) |
| Report | `Flow_GenerateAuditReport` | DOCX → PDF → SharePoint; engagement → Issued |
| Audit log | `Flow_AuditLogTrigger` | `adp_auditlog` (every change) |
| Subscription | `Flow_ManageSubscription` | Updates `adp_entitlement` |

---

## 5. Integration map

| External | Direction | Mechanism |
|---|---|---|
| Tally (RDS-hosted) | Outbound RDP | `apps/rdp-function/RdpGenerate` mints signed token; `RdpFile` returns `.rdp` template with the gateway address. `launch-tally.liquid` POSTs to the function and triggers a browser download. |
| SharePoint | In/out | Flows write evidence + reports; portal embeds document libraries on `documents.liquid`. |
| Power BI | Outbound embed | `{% powerbi %}` Liquid tag on `insights.liquid` with workspace + report IDs from `catalog/powerbi-reports.json`. RLS via `CompanyRLS`. |
| Copilot Studio | Outbound embed | `<iframe>` of bot WebChat on `agents.liquid`. |
| Email / WhatsApp / Telegram | Inbound | Custom connectors in [power-platform/custom-connectors/](../power-platform/custom-connectors/) feed `Flow_Ingest*`. Telegram uses a small Node proxy under [preview/tg-proxy.js](../preview/tg-proxy.js) **only for local preview**. |
| Outlook | Inbound | Standard Office 365 connector inside `Flow_IngestEmail`. |

---

## 6. Deployment topology

| Artifact | Source | Deploy target | Mechanism |
|---|---|---|---|
| Solution (tables, forms, relationships, web roles, web pages, web files, web templates) | [power-platform/solution/](../power-platform/solution/) | Dataverse + Power Pages | `pac solution pack` + `pac solution import` (see [power-platform/scripts/](../power-platform/scripts/)) |
| Flows | [power-platform/flows/](../power-platform/flows/) | Power Automate (same solution) | Bundled in solution import |
| Liquid pages / templates | [power-platform/portal/](../power-platform/portal/) | Power Pages | `pac paportal upload` |
| Catalog JSON | [power-platform/catalog/](../power-platform/catalog/) | Dataverse seed | `power-platform/scripts/init.ps1` seeds; updates via `deploy.ps1` |
| Custom connectors | [power-platform/custom-connectors/](../power-platform/custom-connectors/) | Power Platform (per environment) | `pac connector create` |
| Azure Function | [apps/rdp-function/](../apps/rdp-function/) | Azure Functions (Node 20) | `func azure functionapp publish` |
| Security model | [power-platform/security/table-permissions.yml](../power-platform/security/table-permissions.yml) | Power Pages table permissions | Apply via PAC CLI or portal management app |

Environments are described in [power-platform/deployment-settings.template.json](../power-platform/deployment-settings.template.json); local PC testing is documented in [power-platform/LOCAL-PC-TESTING.md](../power-platform/LOCAL-PC-TESTING.md).

---

## 7. Build vs buy boundary

ADP is **deliberately almost-no-code**. The only custom code is:

1. **Azure Function** (`apps/rdp-function/`) — required because Power Automate cannot mint signed RDP tokens on demand.
2. **Power Query M** (`audit-exceptions.pq`) — the rule engine; declarative but not Liquid/Flow.
3. **Liquid templates** (`portal/pages/*.liquid`, `portal/templates/*.liquid`) — UI only, no business logic.
4. **Preview harness** (`preview/`) — dev-only; never deployed.

Everything else is Power Platform configuration (tables, flows, permissions, embeds). This is the single most important architectural decision: it keeps the surface area maintainable by a small team and aligned to Microsoft's roadmap.

---

## 8. Known gaps

These are tracked in the session plan and roadmap but **not in the current architecture**:

- `adp_observation` and `adp_exceptionresolution` tables (observation / resolution layer is currently implicit on `adp_exception`).
- `adp_samplingplan` table (sampling parameters today live as fields on `adp_workpaper`).
- `Flow_DraftObservation`, `Flow_ResolveException`.
- Real-time Tally / Bank / GST data wiring (today: Power Query nightly).
- Copilot Audit Reviewer bot (mentioned in `catalog/bundles.json`, not yet built).
- Two-way Entra group ↔ `adp_appuser` sync.
