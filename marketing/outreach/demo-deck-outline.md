# Demo Deck — 10-Slide Outline

> Use as a slide-by-slide build sheet. Each slide: title, one-line goal, 3 talking points, visual cue.
> Suggested deck length: 10 slides + 1 thank-you. ~20 minutes including demo.

---

### Slide 1 — Title
**Title:** Smart Accounting Reports
**Goal:** Set the brand and stakes.
- By Smartsoft · 29 years of trusted IT solutions
- The audit & accounts delivery platform built on Microsoft 365
- For CA firms and the businesses they serve
**Visual:** Smartsoft logo top-left, yellow accent strip, screenshot of audit engagement page faded behind.

### Slide 2 — Why this exists
**Title:** The default Indian stack is breaking
**Goal:** Validate the pain in their words.
- Documents in 4 WhatsApp groups + 2 inboxes
- Tally locked to one PC, one office
- Workpapers in Excel, sign-off by email
**Visual:** Three messy "before" thumbnails, single arrow to "after".

### Slide 3 — The platform in one picture
**Title:** Audit. Accounts. Tally. One Microsoft 365 portal.
**Goal:** Visual anchor.
- 25 pages, 4 personas, 1 codebase
- Power Pages + Dataverse + Power Automate + Power BI + Copilot Studio
- One Azure Function (Tally RDP)
**Visual:** The layer-map from `docs/architecture.md`, restyled in brand colors.

### Slide 4 — Personas
**Title:** Four roles. Same platform.
**Goal:** Show this is for everyone in the value chain.
- Smartsoft Operator · Firm Admin · Accountant · Client
- Each sees only what they should (row-level + Liquid + table permissions)
- One Entra ID login for all
**Visual:** Four avatars with scope chips: *all firms / firm / assigned / own*.

### Slide 5 — Audit Suite (live demo)
**Title:** Audit Suite
**Goal:** Show the workpaper + exception flow.
- 4 audit programs, 56 procedures, auto-generated checklist
- Exception engine — 16 rules, nightly, on Tally + bank + GST + payroll
- Sign-off Preparer → Manager → Partner, audit trail
**Visual:** Open `audit-engagement.liquid` in preview harness; click through 3 workpapers.
**Talk track:** "This is what your senior sees Tuesday morning."

### Slide 6 — Document collection
**Title:** One inbox. Auto-filed.
**Goal:** Remove the biggest source of friction.
- WhatsApp + Telegram + email → SharePoint, tagged to client and engagement
- Power Automate flows do the routing
- Clients never log in (unless they want to)
**Visual:** Open `inbox.liquid`; show 3 messages with channel icons.

### Slide 7 — Tally on the cloud
**Title:** The same Tally, from anywhere.
**Goal:** Address the "we already use Tally" objection.
- RDP gateway signed by an Azure Function
- MFA, per-user sessions, daily encrypted backup
- No VPN, no plugin, no Tally upgrade required
**Visual:** Open `launch-tally.liquid`; click Launch (use stub).

### Slide 8 — Dashboards
**Title:** Power BI per company.
**Goal:** Show owner value.
- Row-level security `[CompanyId] = USERNAME()`
- Cashflow · receivables · GST · payroll
- Owner gets phone view; firm gets portfolio view
**Visual:** Open `insights.liquid` with an embedded report tile.

### Slide 9 — Copilot
**Title:** AI where the work happens.
**Goal:** Soft proof of the modern stack.
- Audit Reviewer: Q&A over workpapers, draft observations
- M365 Copilot, Researcher, Analyst — built in
- No prompt engineering for users
**Visual:** Open `agents.liquid`; show one Q&A turn.

### Slide 10 — Pricing & next step
**Title:** Start where you are.
**Goal:** Make the close obvious.
- ₹999 / ₹1,499 / ₹1,799 / ₹2,499 / ₹3,499 per month bundles. 15% off annual.
- Pilot: one client engagement, free, end-to-end
- 1–3 weeks to live for a single firm
**Visual:** Pricing grid (same five tiles as landing page) + a single big CTA: *Book the pilot*.

### Slide 11 — Thank you / Q&A
**Title:** Thank you
- sales@smartsoft.example · +91-XXXXX-XXXXX
- smartsoft.example/demo
**Visual:** Smartsoft logo, yellow accent, contact block.

---

## Speaker notes

- Always open the **preview harness** (http://127.0.0.1:5500/preview/) for the demo slides — fast, no Dataverse dependency, role switcher lets you walk Partner → Accountant → Client without logging out.
- Spend 60% of the deck on demo, 40% on slides. Skip slides freely if the customer asks to see something live.
- End every demo with one concrete next step: *"What we'd need to set up the pilot on {{Company}} is one client engagement and one Tally license. Can we line that up by Friday?"*
