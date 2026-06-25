# Quick Start — Firm Admin (Partner / Principal)

You manage your firm on the platform: clients, people, audits, and billing. You
see **every company in your firm**. This guide gets you productive in five
tasks. For the full picture read the [product walkthrough](product-walkthrough.md);
for exact permissions see [../page-role-matrix.md](../page-role-matrix.md).

---

## Before you start

- Sign in with your Microsoft (Entra ID) account — the same login as Microsoft
  365. One login covers the whole platform.
- Your landing page is **Dashboard / My Day**, scoped to your firm.

To practise without real data, open the
[preview harness](../preview-harness.md) and set the **Role** dropdown to
**Firm Admin**.

---

## 1. Onboard a new client

1. Open **Clients** from the left nav
   ([clients.liquid](../power-platform/portal/pages/clients.liquid)).
2. Choose **Add client** and fill in the company details (name, GSTIN, contacts).
3. Save. This runs `Flow_OnboardCompany` and creates the client workspace.

The client now appears in your roster and is ready for users and engagements.

## 2. Invite users

1. Still on **Clients** (or **Team**), open the client and choose **Invite user**.
2. Enter the person's email and role (Client user, or another firm staff member).
3. Send. `Flow_InviteUser` emails them a portal invitation.

Clients are invited as scoped, read-mostly users; firm staff get accountant
access.

## 3. Assign an accountant

1. Open the client record.
2. Under **Assignments**, add the accountant responsible for this company.
3. Save. The accountant now sees this client in their portfolio (assignment is
   stored in `adp_companyassignment`).

Only assigned accountants can see or work a client — this is how data stays
scoped.

## 4. Start an audit engagement

1. Open **Audit** ([audit.liquid](../power-platform/portal/pages/audit.liquid))
   and choose **Start engagement** (`Flow_StartAuditEngagement`).
2. Pick the company and an audit program — **Statutory FY**, **GST 9C**,
   **Internal Controls**, or **Tax 44AB**.
3. Confirm. The platform auto-generates the procedure checklist (up to 56
   procedures) on the engagement.

Set the engagement header (materiality, dates) — only Firm Admin/Operator can
edit these.

## 5. Review, sign off, and issue the report

1. As workpapers come in, open the engagement
   ([audit-engagement.liquid](../power-platform/portal/pages/audit-engagement.liquid))
   → **Review** tab.
2. Review each workpaper; sign off as Manager, then Partner (`Flow_SignOff`).
   You cannot sign off work you prepared (maker-checker).
3. When all are signed, go to the **Report** tab and choose **Generate audit
   report** (`Flow_GenerateAuditReport`) to produce the Word + PDF and mark the
   engagement **Issued**.

---

## Also yours to manage

- **Service delivery** — balance workload across staff on
  [service-delivery.liquid](../power-platform/portal/pages/service-delivery.liquid).
- **Billing** — view bundles and entitlements, change plans on
  [billing.liquid](../power-platform/portal/pages/billing.liquid)
  (`Flow_ManageSubscription`).
- **Insights** — see the firm-wide portfolio dashboard on
  [insights.liquid](../power-platform/portal/pages/insights.liquid).
- **Team** — manage firm users on
  [team.liquid](../power-platform/portal/pages/team.liquid).

## Tips

- If an accountant can't see a client, check the **assignment** first.
- Engagement header fields (materiality, dates) are Admin-only — accountants
  can't change them.
- Every sign-off and status change is written to the audit trail.
