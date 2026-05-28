# ADP Portal — Usability Guide (Page-by-Page)

This guide answers, for every page in the portal, **what is it for, who uses it, where they enter, what they can do, and where they go next**. It is the canonical product-side companion to [architecture.md](architecture.md) (system view) and [page-role-matrix.md](page-role-matrix.md) (capability grid).

Pages are grouped by **journey**, not folder. The Power Pages files all live under [power-platform/portal/pages/](../power-platform/portal/pages/).

> **Card key**  
> **Purpose** — one-sentence "what is this page for".  
> **Primary persona(s)** — who lands here in the happy path.  
> **Entry points** — left rail, breadcrumbs, deep links, flow notifications.  
> **Key actions** — buttons that change Dataverse or trigger a flow.  
> **Data sources** — FetchXML queries / embeds on the page.  
> **Downstream links** — pages this one leads into.  
> **Known gaps** — what does not yet work or is stubbed.

---

## A. Public / entry

### Home — [index.liquid](../power-platform/portal/pages/index.liquid)
- **Purpose** — Public landing; product story + sign-in CTA.
- **Primary persona(s)** — Unauthenticated visitor (any persona).
- **Entry points** — Portal root URL.
- **Key actions** — Sign in (Entra), Request demo, Pricing.
- **Data sources** — None (static marketing copy).
- **Downstream links** — `dashboard` (after sign-in), `billing` (pricing CTA).
- **Known gaps** — Marketing copy is generic; needs firm-specific branding hook.

---

## B. Daily-use surface (signed-in)

### Dashboard / My Day — [dashboard.liquid](../power-platform/portal/pages/dashboard.liquid)
- **Purpose** — Single landing page after sign-in. Four persona variants (Operator console teaser / Firm summary / "My Day" task list / Client portal home).
- **Primary persona(s)** — All four. Content varies by `adp_personagroup`.
- **Entry points** — Default page after login; `🏠`/`☀` in left rail.
- **Key actions** — Jump to any module via KPI tiles.
- **Data sources** — Stub aggregates from `adp_auditengagement`, `adp_clientrequest`, `adp_exception`, `adp_dataingestion`.
- **Downstream links** — Every other hub.
- **Known gaps** — KPI tiles use static counts in preview; live FetchXML needs an aggregate roll-up entity or a Power Automate "daily snapshot" flow.

### Clients (hub) — [clients.liquid](../power-platform/portal/pages/clients.liquid)
- **Purpose** — Roster of client companies + invite + pipeline view + team directory tab.
- **Primary persona(s)** — Firm Admin, Accountant (read-only of own assignments).
- **Entry points** — `🏢 Clients` in left rail.
- **Key actions** — *+ Add client* (opens onboarding wizard / posts to `Flow_OnboardCompany`), *Invite user* (posts to `Flow_InviteUser`), open client detail.
- **Data sources** — `adp_company`, `adp_companyassignment`, `adp_appuser`.
- **Downstream links** — `audit-engagement` (per client), `service-delivery`, `inbox` (filtered).
- **Known gaps** — Pipeline tab uses placeholder columns; needs a status enum on `adp_company` for stages.

### Inbox (Data Capture) — [inbox.liquid](../power-platform/portal/pages/inbox.liquid)
- **Purpose** — Triage incoming documents from email/WhatsApp/Telegram. Two-pane: company rail on the left, document detail on the right.
- **Primary persona(s)** — Accountant (primary), Firm Admin.
- **Entry points** — `📧 Inbox` in left rail; flow notifications.
- **Key actions** — Classify document, link to engagement, archive, reply.
- **Data sources** — `adp_dataingestion` grouped by `adp_companyid`.
- **Downstream links** — `audit-engagement`, `documents`, `workpaper` (link evidence).
- **Known gaps** — Document preview is a placeholder iframe; real preview needs SharePoint embed token.

### Service Delivery — [service-delivery.liquid](../power-platform/portal/pages/service-delivery.liquid)
- **Purpose** — Workload + schedule + kanban across all engagements for the firm.
- **Primary persona(s)** — Firm Admin (primary), Accountant.
- **Entry points** — `📋 Service Delivery` left rail.
- **Key actions** — Reassign engagement, move kanban card, open engagement.
- **Data sources** — `adp_auditengagement`, `adp_clientrequest`, `adp_workpaper` aggregates.
- **Downstream links** — `audit-engagement`, `clients`.
- **Known gaps** — Kanban drag/drop is visual-only in preview; production needs a write-back flow.

### Insights (Reports hub) — [insights.liquid](../power-platform/portal/pages/insights.liquid)
- **Purpose** — Power BI report list + embed; scoped per company by RLS.
- **Primary persona(s)** — Firm Admin, Accountant, Client.
- **Entry points** — `📈 Insights` / `Reports` in left rail.
- **Key actions** — Choose company, choose report, full-screen embed.
- **Data sources** — `{% powerbi %}` tag against IDs from `catalog/powerbi-reports.json`.
- **Downstream links** — `report-powerbi` (deep link), `reports-company` (per company).
- **Known gaps** — Workspace ID is hard-coded in preview's `renderPage()`; per-firm workspaces need a `adp_config` lookup.

### Agents (incl. Smart Agent) — [agents.liquid](../power-platform/portal/pages/agents.liquid)
- **Purpose** — Chat surface; lists Copilot Studio bots and Microsoft built-ins.
- **Primary persona(s)** — All four (filtered list per persona).
- **Entry points** — `🤖 Agents` / `💬 Support` left rail.
- **Key actions** — Open bot chat in side panel, copy quick prompts.
- **Data sources** — Static list (will move to `adp_config` once bot URLs stabilise).
- **Downstream links** — None (chat overlays).
- **Known gaps** — Bot WebChat iframes are placeholders until Copilot Studio publishes URLs.

### Documents — [documents.liquid](../power-platform/portal/pages/documents.liquid)
- **Purpose** — SharePoint document library browser scoped to a company.
- **Primary persona(s)** — Accountant, Client.
- **Entry points** — `📁 Documents` left rail; from `inbox`, `workpaper`.
- **Key actions** — Upload, download, share link.
- **Data sources** — SharePoint embed (production) / stub list (preview).
- **Downstream links** — `workpaper` (attach as evidence).
- **Known gaps** — SharePoint embed token issuance not wired in preview.

---

## C. Audit module

### Audit (hub) — [audit.liquid](../power-platform/portal/pages/audit.liquid)
- **Purpose** — Cross-engagement view: KPIs + engagement list + persona-specific side panel.
- **Primary persona(s)** — All four; four distinct renderings (Operator platform-health, Firm Admin firm-wide, Accountant "my work", Client "your audit").
- **Entry points** — `🔍 Audit` left rail.
- **Key actions** — *+ Start audit engagement* (→ `Flow_StartAuditEngagement`), *Run exception engine* (→ `Flow_RunExceptionEngine`), filter engagements.
- **Data sources** — `adp_auditengagement`, `adp_workpaper`, `adp_exception`, `adp_clientrequest`. Child queries use `<link-entity name="adp_auditengagement">` to scope by `adp_companyid` for non-Operator/Accountant.
- **Downstream links** — `audit-engagement` (per row), `audit-exceptions`, `client-requests`, `workpaper`.
- **Known gaps** — Search box is UI-only; needs JS wiring. Empty-state messages are persona-aware but copy is terse.

### Audit engagement detail — [audit-engagement.liquid](../power-platform/portal/pages/audit-engagement.liquid)
- **Purpose** — Single engagement with six tabs: **Planning · Fieldwork · Exceptions · Requests · Review · Report**.
- **Primary persona(s)** — Accountant (preparer), Firm Admin (reviewer/partner), Client (read-only).
- **Entry points** — Row click on `audit`; deep link from notifications.
- **Key actions** — Update materiality, advance status pipeline, open workpaper, link exception, generate report.
- **Data sources** — `adp_auditengagement` (header), `adp_workpaper`, `adp_exception`, `adp_clientrequest`, `adp_review`, `adp_auditlog` (Activity tab).
- **Downstream links** — `workpaper`, `audit-exceptions`, `client-requests`.
- **Known gaps** — Status pipeline highlight is static. Report tab download button needs `Flow_GenerateAuditReport` wiring.

### Workpaper — [workpaper.liquid](../power-platform/portal/pages/workpaper.liquid)
- **Purpose** — Single procedure execution; preparer fills sample + evidence + conclusion; reviewer signs off.
- **Primary persona(s)** — Accountant (preparer), Firm Admin (reviewer).
- **Entry points** — From `audit-engagement` Fieldwork tab.
- **Key actions** — *Submit for review* (→ `Flow_SubmitForReview`), *Approve / Reject* (→ `Flow_SignOff`), attach evidence (from `inbox`/`documents`).
- **Data sources** — `adp_workpaper`, `adp_evidence`, `adp_sample`, `adp_review`.
- **Downstream links** — `audit-engagement` (back), `audit-exceptions` (linked rows).
- **Known gaps** — Role gating (Preparer vs Reviewer vs Partner) needs explicit `{% if %}` blocks per button; today it relies on Power Pages table permissions.

### Audit exceptions inbox — [audit-exceptions.liquid](../power-platform/portal/pages/audit-exceptions.liquid)
- **Purpose** — Cross-engagement queue of exception engine findings; filter, link to workpaper, resolve.
- **Primary persona(s)** — Accountant, Firm Admin.
- **Entry points** — `audit` KPI "High-severity exceptions"; left-rail deep link.
- **Key actions** — Filter by severity / source / status / search, *Link to WP*, *Resolve* (status transition).
- **Data sources** — `adp_exception` with engagement join.
- **Downstream links** — `workpaper`, `audit-engagement`.
- **Known gaps** — Filters are UI-only; resolve action needs a flow (today: in-place status update).

### Client requests (PBC) — [client-requests.liquid](../power-platform/portal/pages/client-requests.liquid)
- **Purpose** — Provided-by-client task list per engagement; client uploads here.
- **Primary persona(s)** — Client (responder), Accountant (requester).
- **Entry points** — `audit` KPI "Open client requests"; engagement Requests tab.
- **Key actions** — Upload file, mark submitted, accept / reject (Accountant).
- **Data sources** — `adp_clientrequest`.
- **Downstream links** — `audit-engagement`, `documents`.
- **Known gaps** — Upload UI is a stub `<input type="file">`; needs SharePoint upload + flow.

---

## D. Platform & monetisation

### Operator Console (Smartsoft) — [operator.liquid](../power-platform/portal/pages/operator.liquid)
- **Purpose** — Cross-tenant ops: firms list, catalog editor, connector health, platform health, settings.
- **Primary persona(s)** — Smartsoft Operator **only**.
- **Entry points** — `⚙ Settings` left rail (Operator persona); hash anchors `#firms`, `#catalog`, `#connectors`, `#health`, `#settings`.
- **Key actions** — Onboard firm, edit catalog JSON, restart connector, toggle feature flag.
- **Data sources** — `adp_company`, `adp_config`, `catalog/*.json`, connector status (live).
- **Downstream links** — None (admin-only).
- **Known gaps** — Tabs render but most actions are stubs; many require Smartsoft-tenant admin APIs.

### Billing (Plans + Subscription) — [billing.liquid](../power-platform/portal/pages/billing.liquid)
- **Purpose** — Current bundle + plan switcher + entitlements + invoices.
- **Primary persona(s)** — Firm Admin, Client.
- **Entry points** — `💳 Billing` / `Subscription` left rail; index page Pricing CTA.
- **Key actions** — Change plan (→ `Flow_ManageSubscription`), download invoice.
- **Data sources** — `adp_entitlement`, `catalog/bundles.json`.
- **Downstream links** — None (terminal page).
- **Known gaps** — Invoice list is stubbed; needs accounting backend integration.

### Launch Tally — [launch-tally.liquid](../power-platform/portal/pages/launch-tally.liquid)
- **Purpose** — Generate and download a signed `.rdp` to a per-firm Tally RDS gateway.
- **Primary persona(s)** — Accountant.
- **Entry points** — `💻 Launch Tally` left rail.
- **Key actions** — *Launch Tally* (POSTs to Azure Function `RdpGenerate` → triggers download of `.rdp`).
- **Data sources** — Function endpoint URL + key from `adp_config` / Liquid globals.
- **Downstream links** — None (kicks off RDP client).
- **Known gaps** — In preview, fetch is intercepted to return the static `preview/rdp/SmartsoftTallyServer.rdp`.

### Microsoft Teams — [teams.liquid](../power-platform/portal/pages/teams.liquid)
- **Purpose** — Staff directory + role badges; deep-link to Teams chats.
- **Primary persona(s)** — Firm Admin, Accountant.
- **Entry points** — `💬 Teams` left rail.
- **Key actions** — Open Teams chat with colleague.
- **Data sources** — `adp_appuser` filtered to firm staff.
- **Downstream links** — Teams (external).
- **Known gaps** — Presence indicators are placeholders.

---

## E. Redirect / legacy stubs

These pages exist to keep old bookmarks alive. Each one should be a Liquid `{% redirect %}` (or `<meta http-equiv="refresh">`) to its canonical page.

| Stub | Redirects to |
|---|---|
| [companies.liquid](../power-platform/portal/pages/companies.liquid) | `clients` |
| [onboarding.liquid](../power-platform/portal/pages/onboarding.liquid) | `clients` |
| [reports.liquid](../power-platform/portal/pages/reports.liquid) | `insights` |
| [reports-company.liquid](../power-platform/portal/pages/reports-company.liquid) | `insights` |
| [report-powerbi.liquid](../power-platform/portal/pages/report-powerbi.liquid) | `insights?report=...` |
| [assistant.liquid](../power-platform/portal/pages/assistant.liquid) | `agents` |
| [pricing.liquid](../power-platform/portal/pages/pricing.liquid) | `billing` |
| [subscription.liquid](../power-platform/portal/pages/subscription.liquid) | `billing` |

**Known gap** — these need a hygiene pass to confirm each one performs a real redirect (Phase C P4 in the plan).

---

## F. Persona journeys (the happy paths)

**Smartsoft Operator** — log in → `dashboard` (platform tiles) → `operator#firms` → onboard new firm → `operator#catalog` → edit audit programs → `operator#health` → verify connectors.

**Firm Admin** — log in → `dashboard` (firm KPIs) → `clients` → drill into a client → `audit-engagement` → review status → `service-delivery` → reassign workload → `billing` → confirm entitlements.

**Accountant** — log in → `dashboard` (My Day tasks) → `inbox` → classify new docs → `audit-engagement#fieldwork` → open `workpaper` → upload evidence + sample → *Submit for review* → switch to `audit-exceptions` → triage findings → `launch-tally` to validate in Tally.

**Client** — log in → `dashboard` (your audit summary) → `client-requests` → upload requested docs → `documents` → review what you've shared → `insights` → view your reports → `billing` → confirm subscription.
