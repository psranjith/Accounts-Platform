# Page Reference

Every page in the ADP portal, what it does, who can use it, and how to reach it.
Use this as the support/lookup index. Access codes follow
[../page-role-matrix.md](../page-role-matrix.md):
**OP** = Operator · **FA** = Firm Admin · **AC** = Accountant · **CL** = Client.
**F** full · **E** edit own/assigned · **R** read · **R\*** read own company · **—** hidden.

---

## Primary hubs

| Page | Purpose | OP | FA | AC | CL |
|---|---|---|---|---|---|
| [dashboard](../power-platform/portal/pages/dashboard.liquid) | Role-aware landing / "My Day" — KPIs and what's due | F | F | F | R\* |
| [clients](../power-platform/portal/pages/clients.liquid) | Client roster, onboarding, assignments | F | F | R | — |
| [inbox](../power-platform/portal/pages/inbox.liquid) | Data-capture queue (email/WhatsApp/Telegram → SharePoint) | F | F | E | — |
| [service-delivery](../power-platform/portal/pages/service-delivery.liquid) | Workload Kanban across staff & engagements | F | F | R | — |
| [insights](../power-platform/portal/pages/insights.liquid) | Power BI dashboards (RLS-scoped per company) | F | F | R | R\* |
| [agents](../power-platform/portal/pages/agents.liquid) | Copilot Studio + M365 assistants (Audit Reviewer) | F | F | F | R |
| [audit](../power-platform/portal/pages/audit.liquid) | Audit hub — engagement KPIs + list | F | F | E | R\* |
| [team](../power-platform/portal/pages/team.liquid) | Firm user management | F | F | — | — |

## Audit core

| Page | Purpose | OP | FA | AC | CL |
|---|---|---|---|---|---|
| [audit-engagement](../power-platform/portal/pages/audit-engagement.liquid) | Single engagement: Planning, Fieldwork, Exceptions, Requests, Review, Report tabs | F | F (sign Partner) | E | R\* |
| [workpaper](../power-platform/portal/pages/workpaper.liquid) | Procedure execution — sample, evidence, conclusion, sign-off | F | F (sign) | E (own) | — |
| [audit-exceptions](../power-platform/portal/pages/audit-exceptions.liquid) | Cross-engagement exception queue (16 rules) | F | F | E | — |
| [client-requests](../power-platform/portal/pages/client-requests.liquid) | PBC list — client uploads, accountant accepts/rejects | F | F | E | E (own, upload) |

## Admin & monetisation

| Page | Purpose | OP | FA | AC | CL |
|---|---|---|---|---|---|
| [operator](../power-platform/portal/pages/operator.liquid) | Smartsoft console — firms, catalog, connectors, health | F | — | — | — |
| [billing](../power-platform/portal/pages/billing.liquid) | Bundles, entitlements, plan switching | F | F | R | E (own) |
| [launch-tally](../power-platform/portal/pages/launch-tally.liquid) | Generate signed RDP to the Tally host | F | F | F | — |

## Service delivery & accounting

| Page | Purpose | OP | FA | AC | CL |
|---|---|---|---|---|---|
| [monthly-close](../power-platform/portal/pages/monthly-close.liquid) | BPO close runs — SLA/TAT, sign-off, deliverables, billing | F | F | E | R\* |
| [accounting](../power-platform/portal/pages/accounting.liquid) | Accounting activities (entries, recon, GST, TDS, payroll) | F | F | E | — |
| [important-dates](../power-platform/portal/pages/important-dates.liquid) | Compliance calendar / due dates | F | F | R | R\* |

## Secondary / utilities

| Page | Purpose | OP | FA | AC | CL |
|---|---|---|---|---|---|
| [documents](../power-platform/portal/pages/documents.liquid) | SharePoint document browser per company | F | F | E | E\* (own) |
| [teams](../power-platform/portal/pages/teams.liquid) | Microsoft Teams integration / staff directory | F | F | R | — |
| [index](../power-platform/portal/pages/index.liquid) | Public home / landing | F | F | F | F |

## Redirect stubs

These legacy routes redirect to the current pages and exist only for backward
compatibility:
[companies](../power-platform/portal/pages/companies.liquid) →
Clients ·
[onboarding](../power-platform/portal/pages/onboarding.liquid) → Clients ·
[reports](../power-platform/portal/pages/reports.liquid) /
[reports-company](../power-platform/portal/pages/reports-company.liquid) /
[report-powerbi](../power-platform/portal/pages/report-powerbi.liquid) →
Insights ·
[assistant](../power-platform/portal/pages/assistant.liquid) → Agents ·
[pricing](../power-platform/portal/pages/pricing.liquid) /
[subscription](../power-platform/portal/pages/subscription.liquid) → Billing.

---

## Flows behind the pages

| Flow | Triggered from | Does |
|---|---|---|
| `Flow_OnboardCompany` | Clients | Create client workspace |
| `Flow_OnboardFirm` | Operator | Create firm tenant |
| `Flow_InviteUser` | Clients / Team | Send portal invitation |
| `Flow_IngestEmail` / `Flow_IngestWhatsApp` / `Flow_IngestTelegram` | Inbox | File documents to SharePoint |
| `Flow_StartAuditEngagement` | Audit | Generate procedure checklist |
| `Flow_RunExceptionEngine` | Audit exceptions | Run 16 rules nightly |
| `Flow_SubmitForReview` | Workpaper | Route for sign-off |
| `Flow_SignOff` | Workpaper / Engagement | Manager + Partner sign-off |
| `Flow_GenerateAuditReport` | Engagement (Report) | Build Word + PDF report |
| `Flow_AuditLogTrigger` | All | Write to audit trail |
| `Flow_ManageSubscription` | Billing | Apply plan changes |
| `Flow_LaunchTally` | Launch Tally | Request signed RDP |

See [../../power-platform/flows/README.md](../../power-platform/flows/README.md)
for the full flow catalog.
