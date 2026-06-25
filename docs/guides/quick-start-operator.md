# Quick Start — Smartsoft Operator (Internal)

> **Internal use only.** The Operator console is the Smartsoft-only control
> plane for the whole platform. You see **all firms and all companies**. This
> guide is for Smartsoft staff running and supporting the service.

For exact permissions see [../page-role-matrix.md](../page-role-matrix.md); for
production operations see
[../production-readiness.md](../production-readiness.md).

---

## Before you start

- Sign in with your Smartsoft Microsoft account (Operator role).
- Your home is the **Operator Console**
  ([operator.liquid](../power-platform/portal/pages/operator.liquid)) — the only
  page gated exclusively to Operators.

To explore the UI without real data, open the
[preview harness](../preview-harness.md) and set the **Role** dropdown to
**Smartsoft Operator**.

---

## 1. Onboard a firm

1. Open the **Operator Console → Firms**.
2. Create the firm and set its entitlements (which bundles it has bought:
   Tally Hosting, M365 Integration, Power Suite, Audit Suite, All-in-One).
3. Confirm the firm's admin user is invited.

After this, the Firm Admin can self-serve client onboarding (see
[quick-start-firm-admin.md](quick-start-firm-admin.md)).

## 2. Manage the catalog

- **Console → Catalog** edits the shared definitions that every firm uses:
  - Audit programs — `catalog/audit-programs.json` (4 programs)
  - Audit procedures — `catalog/audit-procedures.json` (56+ procedures)
  - Exception rules — `catalog/exception-rules.json` (16 rules)
  - Pricing bundles — `catalog/bundles.json` (5 bundles)
  - Power BI report registry — `catalog/powerbi-reports.json`

Catalog edits are Operator-only — Firm Admins and accountants consume but can't
change them.

## 3. Manage connectors

- **Console → Connectors** verifies the ingestion channels (email, WhatsApp,
  Telegram) and their custom connectors under
  [custom-connectors/](../../power-platform/custom-connectors/). Restart or
  re-authorize a connector here when ingestion stops.

## 4. Monitor platform health

- **Console → Health** shows the status of flows, connectors, and services.
  Use it as the first stop when a firm reports an issue.
- Pair this with Application Insights / flow run history for root cause (see the
  monitoring items in [../production-readiness.md](../production-readiness.md)).

## 5. Settings & feature flags

- **Console → Settings** toggles platform-level feature flags and environment
  configuration. Change these deliberately — they affect all firms.

---

## Operational reminders

- **Secrets** live in Key Vault, not in the repo — never paste secrets into
  config files or chat (see P0-1 in
  [../production-readiness.md](../production-readiness.md)).
- **Deployments** go dev → test → prod via the pipeline with an approval gate.
  Don't hand-edit production.
- **Audit trail:** Operator actions are logged like everyone else's — assume
  every change is recorded.

## Tips

- Most firm-reported problems are either an **assignment** issue (accountant
  can't see a client) or a **connector** issue (documents stopped arriving) —
  check those two first.
- Catalog changes propagate to all firms, so test program/rule edits against a
  sandbox firm before rolling out.
