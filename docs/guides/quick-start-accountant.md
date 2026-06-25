# Quick Start — Accountant (Firm Staff)

You do the delivery work: capturing documents, executing audit workpapers,
clearing exceptions, and working with clients. You see **only the companies
assigned to you**. This guide covers your daily workflow. For the full picture
read the [product walkthrough](product-walkthrough.md); for exact permissions
see [../page-role-matrix.md](../page-role-matrix.md).

---

## Before you start

- Sign in with your Microsoft (Entra ID) account.
- Your landing page is **My Day** (Dashboard), showing your assigned clients and
  what's due.
- If a client you expect is missing, ask your Firm Admin to **assign** you.

To practise without real data, open the
[preview harness](../preview-harness.md) and set the **Role** dropdown to
**Accountant**.

---

## 1. Triage the inbox

1. Open **Inbox** ([inbox.liquid](../power-platform/portal/pages/inbox.liquid)).
   Documents arrive automatically from email, WhatsApp, and Telegram.
2. For each item, set the **classification** (invoice, bank statement, GST
   return, voucher, etc.).
3. **Link** it to the right engagement or workpaper so it's available as
   evidence later.

You don't chase clients for files — they send the way they already do, and the
ingestion flows file everything to SharePoint.

## 2. Work an audit engagement

1. Open **Audit** ([audit.liquid](../power-platform/portal/pages/audit.liquid))
   and select your engagement
   ([audit-engagement.liquid](../power-platform/portal/pages/audit-engagement.liquid)).
2. Go to the **Fieldwork** tab — you'll see the auto-generated checklist of
   procedures with their assertion and risk level.

## 3. Complete a workpaper

1. Open a procedure to its workpaper
   ([workpaper.liquid](../power-platform/portal/pages/workpaper.liquid)).
2. Record the **sample** (items tested, amounts, results).
3. Attach **evidence** — link documents from the Inbox/Documents.
4. Write your **conclusion**.
5. Choose **Submit for review** (`Flow_SubmitForReview`). It now goes to a
   Manager/Partner — you cannot sign off your own work.

## 4. Clear exceptions

1. Open **Audit exceptions**
   ([audit-exceptions.liquid](../power-platform/portal/pages/audit-exceptions.liquid)).
   These are findings from the nightly exception engine (16 rules across Tally,
   bank, GST, payroll).
2. For each exception, **link** it to the relevant workpaper and add your
   conclusion.
3. You can re-run the engine for a client with **Run exception engine**
   (`Flow_RunExceptionEngine`).

## 5. Manage client requests (PBC)

1. Open **Client requests**
   ([client-requests.liquid](../power-platform/portal/pages/client-requests.liquid)).
2. **Create a request** with a description and due date — the client gets
   notified.
3. When the client uploads (portal or WhatsApp), **accept** or **reject** the
   evidence.

---

## Also available to you

- **Documents** — browse the client's filed documents on
  [documents.liquid](../power-platform/portal/pages/documents.liquid).
- **Launch Tally** — open the client's Tally over a secure session from
  [launch-tally.liquid](../power-platform/portal/pages/launch-tally.liquid).
- **Insights** — view dashboards for your assigned clients on
  [insights.liquid](../power-platform/portal/pages/insights.liquid).
- **Agents** — ask the Audit Reviewer Copilot questions about your workpapers on
  [agents.liquid](../power-platform/portal/pages/agents.liquid).

## Tips

- Link evidence to workpapers **as you triage the inbox** — it saves hunting
  later.
- You can edit only **your own** workpapers as preparer; submitted ones are
  locked pending review.
- Clear exceptions early — they're what reviewers look at first.
