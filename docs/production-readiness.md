# Production Readiness Assessment & Remediation Roadmap

> **Status (2026-06-19): NOT production-grade yet.** The platform has a solid
> architecture, a sound CI/CD skeleton, and a well-defined security model, but
> several **blocking gaps** must be closed before a customer-facing production
> go-live. This document is the single source of truth for what is ready, what
> is not, and the order in which to fix it.

For the system design see [architecture.md](architecture.md). For the access
contract see [page-role-matrix.md](page-role-matrix.md). For the dev simulator
see [preview-harness.md](preview-harness.md).

---

## 1. Verdict at a glance

| # | Area | Status | Blocking go-live? |
|---|---|---|---|
| 1 | Secrets & config management | 🔴 Not ready | **Yes** |
| 2 | Automated testing | 🔴 None | **Yes** |
| 3 | Dataverse solution completeness | 🔴 Unverified | **Yes** |
| 4 | CI/CD gates & rollback | 🟠 Incomplete | **Yes** |
| 5 | Audit trail & logging | 🔴 Missing | **Yes** |
| 6 | RDP Azure Function authorization | 🔴 Missing authZ | **Yes** |
| 7 | Incomplete / stubbed features | 🟠 ~30 items | Partial |
| 8 | Security model (RBAC) | ✅ Defined | No — verify live |
| 9 | Dev/Test/Prod separation | ✅ Defined | No — verify config |
| 10 | Preview harness isolation | ✅ Dev-only | No |

**Bottom line:** six blocking categories (1–6) must reach green, and the
partial item (7) must have its customer-visible stubs either finished or
explicitly de-scoped, before the platform is production-grade.

---

## 2. Blocking findings (P0 — must fix before go-live)

### P0-1 · Secrets & configuration management 🔴

**Evidence**
- [apps/rdp-function/local.settings.json.sample](../apps/rdp-function/local.settings.json.sample)
  ships a real-looking production endpoint and service account:
  `RDP_FULL_ADDRESS` = a public IP, `RDP_USERNAME` = a service account name,
  and `RDP_SIGNING_SECRET` as a weak placeholder with no entropy requirement.
- [power-platform/deployment-settings.template.json](../power-platform/deployment-settings.template.json)
  lists `adp_RdpFunctionKey`, `adp_DocIntelKey`, `adp_WhatsAppAccessToken`,
  `adp_TelegramBotToken` as `__SET_SECURELY__` with **no documented mechanism**
  for how they are populated in each environment.
- [power-platform/flows/README.md](../power-platform/flows/README.md) mentions
  Azure Key Vault as "preferred" but it is **not wired in**.
- [preview/auth-config.js](../preview/auth-config.js) hardcodes an
  environment-specific Copilot bot id and Power Platform environment subdomain.

**Risk:** Leaked infrastructure details, secrets committed in templates, no
rotation, no environment isolation of credentials.

**Fix**
1. Replace every secret in `local.settings.json.sample` with non-identifying
   placeholders (`<your-gateway-host>`, `<set-in-key-vault>`) and remove the
   real IP and username.
2. Stand up an **Azure Key Vault** per environment; reference it from the
   Function App (Key Vault references in App Settings) and from Power Automate
   flows (Key Vault connector or environment variables backed by Key Vault).
3. Enforce a minimum-entropy `RDP_SIGNING_SECRET` (≥ 32 random bytes) and
   fail fast at startup if it is missing or weak.
4. Move the Copilot/PP environment ids in `auth-config.js` into a
   `auth-config.local.js` override (already git-ignored) and ship only a
   placeholder sample.
5. Document a **quarterly key-rotation** procedure.

**Verification:** Grep the repo for the old IP, username, and bot id → zero
hits. Confirm the Function App reads `RDP_SIGNING_SECRET` from Key Vault.
Confirm a missing secret produces a clear startup failure, not a 500 at
request time.

---

### P0-2 · Zero automated tests 🔴

**Evidence:** No `*.test.*`, `*.spec.*`, `test/`, or `tests/` anywhere.
[apps/rdp-function/package.json](../apps/rdp-function/package.json) has no test
script and no test dependency.

**Risk:** No regression safety net; the JWT-signed RDP path (the most
security-sensitive code) is untested.

**Fix**
1. Add a Jest suite for the RDP Function covering: valid token round-trip,
   expired token, tampered/invalid signature, missing `RDP_SIGNING_SECRET`,
   missing RDP template, malicious `companyId` input, and missing query params.
2. Add smoke checks for each Power Automate flow's trigger/contract (at minimum
   a documented manual test matrix until automated flow tests exist).
3. Wire `npm test` into CI as a required gate before any solution import.

**Verification:** `npm test` passes locally and in CI; the CI import step does
not run if tests fail.

---

### P0-3 · Dataverse solution completeness unverified 🔴

**Evidence:** [power-platform/solution/src](../power-platform/solution/src)
currently exposes only `agents/AuditReviewer.yaml`. The docs reference ~13
`adp_*` tables, but no entity/relationship/choice XML is present in source to
confirm the schema is complete and exported.

**Risk:** Importing to production with missing tables, relationships, choices,
or security roles causes flows and FetchXML queries to fail at runtime.

**Fix**
1. Export the full unmanaged solution from the DEV environment and commit the
   `customizations.xml` / entity definitions to `power-platform/solution/src`.
2. Produce a checklist confirming every table in
   [architecture.md](architecture.md) and the FetchXML in the portal pages
   exists in the exported schema, with relationships and choice sets.
3. Confirm security roles are part of the solution (not hand-created in DEV).

**Verification:** A clean import into an empty TEST environment succeeds with
no missing-dependency errors, and every portal page renders against real
Dataverse (not stubs).

---

### P0-4 · CI/CD gates & rollback 🟠

**Evidence:** [.github/workflows/power-platform.yml](../.github/workflows/power-platform.yml)
defines dev → test → prod but: no approval gate before prod, no pre-import
validation, the managed solution is exported from **DEV** (skipping TEST), and
there is no rollback or post-deploy smoke test.

**Risk:** Unreviewed, unvalidated changes can flow straight to production with
no way to verify success or revert.

**Fix**
1. Add a **manual approval** (GitHub environment protection rule) before the
   prod job.
2. Add a validation stage: solution checker (`pac solution check`), `npm test`,
   and link/lint checks — all required.
3. Export the managed solution from **TEST**, not DEV, so prod always gets the
   tested artifact.
4. Add a post-deploy smoke test (hit a known portal page + the RDP health
   endpoint) and document a rollback (re-import previous managed solution
   version).

**Verification:** A prod deploy cannot proceed without approval; a failing test
or solution-checker error blocks the import; the smoke test runs after import.

---

### P0-5 · Audit trail & logging 🔴

**Evidence:** `adp_auditlog` is referenced but no flow is confirmed to write to
it. The RDP Function does not log JWT issuance or verification failures. No
record of who accessed PII columns (`adp_company.adp_gstin`, `adp_config`).

**Risk:** Cannot demonstrate regulatory/compliance traceability; security
incidents are invisible.

**Fix**
1. Confirm/implement a flow (or plugin) that writes meaningful actions to
   `adp_auditlog` (sign-off, status change, onboarding, plan change, RDP
   launch).
2. Add Application Insights to the Function App; log every token issue and
   every verification failure with correlation ids (no secrets in logs).
3. Enable Dataverse auditing on PII tables/columns.

**Verification:** Performing a sign-off and an RDP launch produces audit-log
rows and App Insights traces; a forged token logs a verification failure.

---

### P0-6 · RDP Azure Function authorization 🔴

**Evidence:** [apps/rdp-function/RdpGenerate/index.js](../apps/rdp-function/RdpGenerate/index.js)
issues a JWT for any `companyId` with no caller authorization and no check that
the caller is entitled to that company. No rate limiting or input validation
against Dataverse.

**Risk:** A user could mint a token for a company they do not own
(defense-in-depth currently relies solely on Power Pages table permissions).

**Fix**
1. Require an authenticated, authorized caller (Function key + validated portal
   identity, or call only via a trusted Power Automate connection with managed
   identity).
2. Validate that the caller's `adp_appuser`/assignment actually maps to the
   requested `companyId` before issuing a token.
3. Add rate limiting on `RdpGenerate` and validate/whitelist `companyId`
   format and existence.

**Verification:** A request for a non-owned `companyId` is rejected; rapid
repeated requests are throttled; unauthenticated requests are denied.

---

## 3. Important but non-blocking (P1)

### P1-1 · Customer-visible stubbed features 🟠
[docs/usability.md](usability.md) documents ~30 gaps. The ones that are
**customer-visible** must be finished or explicitly de-scoped before a paid
go-live:

| Feature | Page | Gap |
|---|---|---|
| Billing / invoices | [billing.liquid](../power-platform/portal/pages/billing.liquid) | Stubbed; needs accounting backend |
| Document upload / preview | [documents.liquid](../power-platform/portal/pages/documents.liquid), [client-requests.liquid](../power-platform/portal/pages/client-requests.liquid) | SharePoint embed/upload token not wired |
| Kanban write-back | [service-delivery.liquid](../power-platform/portal/pages/service-delivery.liquid) | Visual-only; no write-back flow |
| Power BI workspace | [insights.liquid](../power-platform/portal/pages/insights.liquid) | Hardcoded workspace id; per-firm lookup missing |
| Copilot web chat | [agents.liquid](../power-platform/portal/pages/agents.liquid) | Placeholder URLs until Copilot Studio publishes |
| Dashboard KPI tiles | [dashboard.liquid](../power-platform/portal/pages/dashboard.liquid) | Static counts; needs rollup/snapshot flow |

**Action:** For each, decide *finish for v1* vs *de-scope and hide*. Do not ship
a stub that looks live to a paying customer.

### P1-2 · Error-handling standards 🟠
Function responses are inconsistent (mix of 400/500 without detail); portal
pages don't surface friendly errors; flows lack standardized error handling.
**Action:** Define one error contract and apply it across Function, flows, and
Liquid pages.

### P1-3 · Live security verification 🟠
[table-permissions.yml](../power-platform/security/table-permissions.yml) and
[security-model.md](../power-platform/portal/security-model.md) are well-defined
but the preview harness does **not** enforce them. **Action:** Verify every
row in [page-role-matrix.md](page-role-matrix.md) against the real portal with
test users for all four personas, including column security on `adp_gstin`.

---

## 4. Lower priority (P2)

- **Monitoring/alerting:** dashboards + alerts on Function failures, flow run
  failures, and portal availability.
- **Runbooks:** incident response, common prod issues, secret-population steps;
  finish [LOCAL-PC-TESTING.md](../power-platform/LOCAL-PC-TESTING.md) (currently
  ends mid-section).
- **Node runtime:** the Functions host warns Node 20 reached EOL — pin a
  supported LTS for the Function App.
- **Performance/load:** validate FetchXML query performance with production-like
  data volumes.

---

## 5. Go-live checklist

Treat go-live as gated: **every P0 box must be checked**, and every
customer-visible P1 stub resolved or hidden.

- [ ] **P0-1** All secrets in Key Vault; no secrets/IPs/usernames in repo; rotation documented
- [ ] **P0-2** Jest suite for RDP Function passing; `npm test` is a required CI gate
- [ ] **P0-3** Full solution exported to source; clean import into empty TEST succeeds
- [ ] **P0-4** Approval gate + validation stage + export-from-TEST + smoke test + rollback documented
- [ ] **P0-5** Audit-log writes confirmed; App Insights on Function; Dataverse auditing on PII
- [ ] **P0-6** RDP `companyId` authorization enforced; rate limiting; input validation
- [ ] **P1-1** Every customer-visible stub finished or explicitly hidden
- [ ] **P1-3** All four personas verified live against the page-role matrix
- [ ] Backups & restore tested (Dataverse + Tally host)
- [ ] DR/rollback rehearsed once end-to-end
- [ ] Support runbook + on-call owner assigned

---

## 6. Recommended sequence

1. **Week 1 — Secrets & solution:** P0-1, P0-3 (unblocks everything else).
2. **Week 2 — Function hardening & tests:** P0-2, P0-6, P0-5 (Function side).
3. **Week 3 — Pipeline & audit:** P0-4, P0-5 (Dataverse side).
4. **Week 4 — Feature finish & verification:** P1-1, P1-3, then run the go-live
   checklist.

> Estimated to first production-grade go-live: close P0 first; P1 customer-visible
> stubs determine whether v1 is "audit-only" or "full platform". A phased launch
> (Audit Suite first, Billing/Documents next) is the lowest-risk path.
