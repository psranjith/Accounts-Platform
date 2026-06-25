# Sales Demo Script — Click-by-Click

A detailed, repeatable demo runbook for **Smart Accounting Reports** by
Smartsoft. It drives the [preview harness](../../docs/preview-harness.md) live
and maps to the 10-slide [demo-deck-outline.md](demo-deck-outline.md). Total
run time **~20 minutes** (≈60% live demo, 40% slides). For positioning language
and objection handlers, keep [MESSAGING.md](../MESSAGING.md) and
[cold-call-script.md](cold-call-script.md) open.

> **Why the harness:** it renders every page with realistic stub data, needs no
> login or Dataverse, and the Role dropdown lets you switch Partner → Accountant
> → Client instantly. It is the fastest, most reliable way to demo.

---

## 0. Setup (do this before the call)

### Start the three local services

```pwsh
# 1. Static portal preview   -> http://127.0.0.1:5500/preview/
npx http-server . -a 127.0.0.1 -p 5500 -c-1

# 2. Telegram embed proxy     -> http://127.0.0.1:5501   (only needed for tg.html)
node preview/tg-proxy.js

# 3. RDP Azure Functions host -> http://localhost:7071   (makes Launch Tally work)
cd apps/rdp-function ; func start
```

### Pre-flight checklist

- [ ] Open <http://127.0.0.1:5500/preview/> — confirm the **Page** and **Role**
      dropdowns load and a page renders.
- [ ] Set **Signed in** = checked (so auth-gated sections render).
- [ ] Browser zoom ~110–125%, window maximised, notifications silenced.
- [ ] Pre-load these tabs/pages so you never fumble: `audit-engagement`,
      `inbox`, `launch-tally`, `insights`, `agents`, `billing`.
- [ ] Know the **two switches** you'll use constantly: the **Page** dropdown and
      the **Role** dropdown. Role is driven by the dropdown — **not** the URL.

### Golden rules

- **Drive from the Role dropdown**, not by logging in/out.
- **Stay on the happy path** (see "Pages to avoid" below) — don't click into
  features that are still stubbed.
- **Narrate the persona**, not the UI: say *"as the Partner I now…"* before each
  switch.

---

## Demo flow (maps to deck slides)

| Segment | Slide | Page(s) | Role | ~min |
|---|---|---|---|---|
| Open / stakes | 1–2 | — (slides) | — | 2 |
| Platform & personas | 3–4 | `dashboard` | switch all 4 | 2 |
| Audit suite | 5 | `audit` → `audit-engagement` → `workpaper` | FA → AC → FA | 6 |
| Document capture | 6 | `inbox` | AC | 2 |
| Tally on cloud | 7 | `launch-tally` | AC/FA | 2 |
| Dashboards | 8 | `insights` | CL then FA | 2 |
| Copilot | 9 | `agents` | AC | 1 |
| Pricing & close | 10 | `billing` (optional) | FA | 3 |

---

## Segment 1 — Open & stakes *(Slides 1–2, ~2 min)*

Stay on slides. Validate the pain in their words:
*"Documents in four WhatsApp groups and two inboxes. Tally locked to one PC.
Workpapers in Excel, sign-off by email."* Ask: **"Does that sound like a normal
month for you?"** Let them say yes before you show anything.

---

## Segment 2 — Platform & personas *(Slides 3–4, ~2 min)*

1. Switch to the harness. **Page → `Dashboard / My Day`**.
2. **Role → `Firm Admin`.** *"This is what a partner sees — the whole firm."*
3. **Role → `Accountant`.** *"Same platform, but staff see only their assigned
   clients."*
4. **Role → `Client`.** *"And the client sees only their own company."*
5. **Role → `Smartsoft Operator`** briefly. *"And we run the platform behind it."*

**Talking point:** *"Four roles, one Microsoft 365 login, and everyone sees only
what they should — enforced at the data layer, not just hidden in the UI."*

End on **Role → `Firm Admin`** to begin the story.

---

## Segment 3 — Audit Suite (the centrepiece) *(Slide 5, ~6 min)*

> This is the segment that closes deals. Spend the most time here.

1. **Page → `Audit (hub)`**, Role **Firm Admin**.
   *"4 audit programs — Statutory, GST 9C, Internal Controls, Tax 44AB — and 56
   procedures. Starting an engagement auto-generates the whole checklist."*
2. **Page → `Audit engagement detail`.** Walk the tabs left to right:
   - **Planning** — *"materiality and risk areas set up front."*
   - **Fieldwork** — *"every procedure, pre-tagged with its assertion and risk
     level."*
3. **Page → `Workpaper`.** *"Here's one procedure. The preparer records the
   sample, attaches evidence, writes a conclusion, and submits."*
4. **Switch Role → `Accountant`** on the same workpaper. *"This is the staff
   view — they fill it in, but they can't sign off their own work."*
5. **Switch Role → `Firm Admin`**, back to `Audit engagement detail` → **Review**
   tab. *"Manager signs off, then Partner. Every step is an immutable audit
   trail."*
6. **Page → `Audit exceptions inbox`** (Role Accountant). *"Overnight, 16 rules
   run on Tally, bank, GST, and payroll — weekend journals, unreconciled items,
   round-number postings. This is what your senior sees Tuesday morning."*

**Mini-close:** *"Same programs, same rules, same sign-off trail across every
client — that consistency is what scales a practice."*

---

## Segment 4 — Document capture *(Slide 6, ~2 min)*

1. **Page → `Inbox (Data Capture)`**, Role **Accountant**.
2. Point at the channel icons. *"Invoices and statements arrive on WhatsApp,
   Telegram, and email — exactly how clients already send them."*
3. *"Power Automate files each one to SharePoint, tagged to the client and the
   engagement. Your client never has to log in."*

**Objection pre-empt:** if they say "our clients won't use a portal" — *"They
don't have to. They keep using WhatsApp; the platform does the filing."*

---

## Segment 5 — Tally on the cloud *(Slide 7, ~2 min)*

1. **Page → `Launch Tally`**, Role **Accountant** (or Firm Admin).
2. Click **Launch**. *"That generated a short-lived, signed session to the Tally
   host — handled by an Azure Function."*
3. *"MFA, per-user sessions, daily encrypted backup. No VPN, no plugin, no Tally
   upgrade. The same Tally, from anywhere."*

> The RDP function host (port 7071) makes this work end-to-end in the harness.

**Objection pre-empt:** "we already use Tally on a server" — *"This is that same
Tally, just reachable securely from anywhere, with backup and access control
built in."*

---

## Segment 6 — Dashboards *(Slide 8, ~2 min)*

1. **Page → `Insights (Reports hub)`**, Role **Client**. *"The owner opens this
   on their phone — cashflow, receivables, GST, payroll — scoped to just their
   company by row-level security."*
2. **Switch Role → `Firm Admin`.** *"The firm sees the whole portfolio across
   every client. Same reports, different slice of data."*

---

## Segment 7 — Copilot *(Slide 9, ~1 min)*

1. **Page → `Agents (incl. Smart Agent)`**, Role **Accountant**.
2. *"An Audit Reviewer assistant answers questions over the workpapers and drafts
   observations — plus the M365 Copilot tools your team already has. No prompt
   engineering for users."*

> Keep this short — show the surface, don't dwell on live chat.

---

## Segment 8 — Pricing & close *(Slide 10, ~3 min)*

1. *(Optional)* **Page → `Billing (Plans + Subscription)`**, Role **Firm Admin**
   — show bundles and entitlements briefly.
2. Switch to the pricing slide: *"₹999 to ₹3,499 per month bundles, 15% off
   annual."*
3. **The close:** *"Here's what I propose — a pilot on one client engagement,
   end to end, free. What we'd need is one client and one Tally license. Can we
   line that up by Friday?"*

---

## Pages to AVOID in a live demo

These are still placeholders/stubbed and should **not** be clicked into during a
sales demo (they look unfinished). See
[../../docs/usability.md](../../docs/usability.md) and
[../../docs/production-readiness.md](../../docs/production-readiness.md):

- **Billing deep actions** — invoice list is stubbed; show bundles only, don't
  open invoices.
- **Documents preview / upload** — SharePoint embed/upload not wired; describe
  it from the Inbox instead.
- **Service-delivery Kanban drag-drop** — visual only; talk over it, don't drag.
- **Agents live chat** — Copilot URLs are placeholders; show the surface, don't
  start a long conversation.
- **Redirect stub pages** — `companies`, `onboarding`, `reports*`, `assistant`,
  `pricing`, `subscription` (use the current pages they redirect to).

---

## If the demo breaks

- **Page won't render** → reselect from the **Page** dropdown; check the
  http-server terminal (port 5500) is still running.
- **Launch Tally does nothing** → confirm the Functions host (port 7071) is up;
  it falls back to a stub if not.
- **Wrong data for the role** → confirm you changed the **Role dropdown**, not
  the URL (URL `role=` is ignored).
- **Lost your place** → every page is independent; just pick the next page from
  the dropdown and keep narrating the persona.

---

## One-line recap to leave them with

*"Audit, accounts, and Tally — for your whole firm and every client — on the
Microsoft 365 you already trust. Start with one free pilot engagement."*

Follow up with the relevant email sequence:
[CA firms](email-ca-firms.md) or [SMB owners](email-smb.md).
