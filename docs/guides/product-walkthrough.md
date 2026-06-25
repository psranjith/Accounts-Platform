# Product Walkthrough — End-to-End Journey

A narrative tour of the Accounts Delivery Platform (ADP), following one client
engagement from sign-up to audit report and renewal. Read it top to bottom to
understand how the pages, personas, and flows fit together. Each stage links to
the page involved and the Power Automate flow behind it.

> **Cast:** *Sharda & Associates* (a CA firm) onboards a new client, *Acme
> Traders* (an SMB). **Priya** is the Firm Admin/Partner, **Rahul** is the
> Accountant, **Anita** is the Client (Acme's finance head), and **Smartsoft
> Operator** runs the platform.

You can replay every stage in the [preview harness](../preview-harness.md) by
choosing the named page and switching the Role dropdown.

---

## The journey at a glance

```
Operator         Firm Admin              Accountant                 Client
   │                  │                       │                        │
   1 Onboard firm     2 Onboard client        3 Capture documents      │
   │                  │  + invite users        (inbox)                 │
   │                  │  + assign staff                                │
   │                  4 Plan service           5 Run audit             │
   │                    delivery                 fieldwork             │
   │                                            6 Manage exceptions    │
   │                                            7 Raise PBC ─────────► 7 Upload docs
   │                  8 Review & sign off ◄──── 8 Submit for review    │
   │                  9 Insights / Power BI ───────────────────────► 9 Own dashboard
   │                  10 Generate report                              │
   │                  11 Billing & renewal ────────────────────────► 11 Subscription
```

---

## Stage 1 — Onboard the firm *(Smartsoft Operator)*

**Page:** [operator.liquid](../power-platform/portal/pages/operator.liquid)

The Operator creates the firm tenant, enables the bundles the firm has bought
(e.g. Audit Suite + Tally Hosting), and confirms the ingestion connectors
(email, WhatsApp, Telegram) are healthy. This is a one-time setup per firm and
is invisible to everyone else.

**Behind the scenes:** firm record + entitlements created; connectors verified
on the Operator console's health panel.

---

## Stage 2 — Onboard the client & invite users *(Firm Admin)*

**Page:** [clients.liquid](../power-platform/portal/pages/clients.liquid)
· **Flows:** `Flow_OnboardCompany`, `Flow_InviteUser`

Priya adds *Acme Traders* as a client company, invites Anita (Client user) to
the portal, and assigns Rahul as the accountant responsible for Acme via
`adp_companyassignment`. From this moment, Rahul sees Acme in his portfolio and
Anita can sign in to her own scoped view.

**What each persona now sees:** Priya — all firm clients; Rahul — only assigned
clients; Anita — only Acme.

---

## Stage 3 — Capture documents *(Accountant / automatic)*

**Page:** [inbox.liquid](../power-platform/portal/pages/inbox.liquid)
· **Flows:** `Flow_IngestEmail`, `Flow_IngestWhatsApp`, `Flow_IngestTelegram`

Acme's invoices and bank statements arrive the way they already send them — on
WhatsApp, Telegram, or email. The ingestion flows file each document into
SharePoint, tagged to the client and engagement, and surface it in the Inbox.
Rahul classifies each item (invoice, bank statement, GST return) and links it
to the right engagement. **Clients never have to log in to send documents.**

---

## Stage 4 — Plan service delivery *(Firm Admin)*

**Page:** [service-delivery.liquid](../power-platform/portal/pages/service-delivery.liquid)

Priya sees the firm's workload as a Kanban of engagements across all
accountants. She balances the load, checks who is overcommitted, and confirms
Acme's audit is scheduled with Rahul. For productised monthly work, the
[monthly-close.liquid](../power-platform/portal/pages/monthly-close.liquid)
board tracks each close run with its SLA and sign-off state.

---

## Stage 5 — Run audit fieldwork *(Accountant)*

**Pages:** [audit.liquid](../power-platform/portal/pages/audit.liquid) →
[audit-engagement.liquid](../power-platform/portal/pages/audit-engagement.liquid)
→ [workpaper.liquid](../power-platform/portal/pages/workpaper.liquid)
· **Flow:** `Flow_StartAuditEngagement`

Priya (or the Operator) starts the engagement and picks an audit program —
Statutory FY, GST 9C, Internal Controls, or Tax 44AB. The platform
auto-generates a checklist from the catalog (4 programs, 56 procedures), each
procedure pre-tagged with its assertion, risk level, and sample-size guidance.

Rahul works the **Fieldwork** tab: for each procedure he opens the workpaper,
records the sample, attaches evidence (linked from the Inbox/Documents), and
writes his conclusion. When done he submits it for review.

---

## Stage 6 — Manage exceptions *(Accountant)*

**Page:** [audit-exceptions.liquid](../power-platform/portal/pages/audit-exceptions.liquid)
· **Flow:** `Flow_RunExceptionEngine`

Overnight, the exception engine runs 16 rules against Acme's Tally, bank, GST,
and payroll data — weekend journal entries, unreconciled bank items > 30 days,
round-number postings, GST rate mismatches, and more. Rahul reviews the
findings each morning, links each exception to the relevant workpaper, and adds
his conclusion. *"This is what your senior sees Tuesday morning."*

---

## Stage 7 — Client requests (PBC) *(Accountant ↔ Client)*

**Page:** [client-requests.liquid](../power-platform/portal/pages/client-requests.liquid)

Rahul raises a "provided-by-client" (PBC) request — say, a signed bank
confirmation — with a due date. Anita receives it and uploads the document
(from the portal, or simply by replying on WhatsApp). Rahul accepts or rejects
the evidence. The request list is the shared to-do between firm and client.

---

## Stage 8 — Review & sign-off *(Accountant → Manager → Partner)*

**Pages:** [workpaper.liquid](../power-platform/portal/pages/workpaper.liquid) →
[audit-engagement.liquid](../power-platform/portal/pages/audit-engagement.liquid)
(Review tab) · **Flows:** `Flow_SubmitForReview`, `Flow_SignOff`

Rahul's submitted workpapers flow to the Manager for the first sign-off and then
to the Partner for final sign-off. Each step is recorded in an immutable audit
trail (`adp_auditlog`). Maker-checker is enforced: a preparer cannot sign off
their own work.

---

## Stage 9 — Insights *(everyone, scoped)*

**Page:** [insights.liquid](../power-platform/portal/pages/insights.liquid)

Anita opens her dashboard — cashflow, receivables, GST, payroll — on her phone,
scoped to Acme only by Power BI row-level security (`[CompanyId] = USERNAME()`).
Priya sees the firm's portfolio view across all clients. Same reports, different
slice of data.

---

## Stage 10 — Generate the audit report *(Partner)*

**Page:** [audit-engagement.liquid](../power-platform/portal/pages/audit-engagement.liquid)
(Report tab) · **Flow:** `Flow_GenerateAuditReport`

With all workpapers signed off, Priya clicks **Generate audit report**. The
flow assembles every workpaper, conclusion, and sign-off into a Word + PDF
document and marks the engagement Issued. No copy-pasting from Excel.

---

## Stage 11 — Billing & renewal *(Firm Admin ↔ Client)*

**Page:** [billing.liquid](../power-platform/portal/pages/billing.liquid)
· **Flow:** `Flow_ManageSubscription`

Priya reviews Acme's bundle and entitlements. Mid-year, Anita can upgrade her
own subscription (e.g. add Audit Suite) from her scoped billing view, and the
subscription flow applies the change. Renewal is one screen, not an email
thread.

---

## What happens next

That single engagement now repeats across every client in the firm's
portfolio, with the same audit programs, the same exception rules, and the same
sign-off trail — which is exactly the consistency a growing practice needs.

For step-by-step instructions per persona, continue to:
[Firm Admin](quick-start-firm-admin.md) ·
[Accountant](quick-start-accountant.md) ·
[Client](quick-start-client.md) ·
[Operator](quick-start-operator.md).
