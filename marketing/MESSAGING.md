# Smart Accounting Reports — Messaging Foundation

> Single source of truth for all marketing copy. If a tagline, value prop or stat appears in landing/pricelist/social/email, it should trace back to this file.

---

## 1. Brand lock-up

- **Parent brand:** Smartsoft — *29 years of trusted IT solutions*
- **Product (consumer-facing):** **Smart Accounting Reports**
- **Product (technical / docs):** Accounts Delivery Platform (ADP)
- **Logo:** `marketing/assets/smartsoft-logo.png` (transparent PNG). Variants: `smartsoft-logo.svg`, `smartsoft-logo-onblack.png` if available.
- **Colors:** Black `#0a0a0a`, Yellow `#FFCB05`, Surface `#FFFFFF`, Muted `#64748B`.
- **Type:** Inter / Segoe UI.

---

## 2. One-liner (use everywhere)

> **The audit and accounts delivery platform built on Microsoft 365 — for CA firms that want to deliver faster, with proof, and for businesses that want a real-time window into their books.**

Short form: *"Audit. Accounts. Tally. All on one secure Microsoft cloud."*

---

## 3. Ideal customer profile

### Track A — CA firms (primary buyer: Partner / Firm Admin)
- 5–150 person practice
- 30–500 client companies
- Mix of statutory audit, GST, internal audit, MIS / virtual CFO
- Already on Tally; struggling with email-based document collection, manual workpapers, and inconsistent reviews

### Track B — SMB clients (primary buyer: Owner / Finance Head)
- ₹5 Cr–₹500 Cr turnover
- 1–10 person finance team using Tally
- Want their CA + their own team on the same view of the books
- Need WhatsApp / email / portal to submit bills without chasing
- Want a real-time dashboard the owner actually opens on the phone

---

## 4. Value pillars (8 — map to landing feature grid)

| # | Pillar | Proof in product | Audience |
|---|---|---|---|
| 1 | **Secure Tally on the cloud** | RDP gateway + Azure Function signed `.rdp`, MFA, daily encrypted backup | Both |
| 2 | **One inbox for documents** | Email, WhatsApp, Telegram, portal upload → SharePoint, tagged to client | Both |
| 3 | **Audit workpapers, automated** | 4 audit programs, 56 procedures, auto-generated checklist with risk + assertion mapping | CA firms |
| 4 | **Exception engine on real data** | 16 rules, runs nightly on Tally + bank + GST + payroll, writes to `adp_exception` | CA firms |
| 5 | **Multi-level sign-off with audit trail** | Preparer → Manager → Partner, immutable log, one-click PDF report | CA firms |
| 6 | **Embedded Power BI per client** | Row-level security `[CompanyId] = USERNAME()`, dashboards the owner actually opens | Both |
| 7 | **Copilot, where the work happens** | Audit Reviewer Q&A over workpapers, draft observations, M365 Copilot on the side | Both |
| 8 | **Built on Microsoft 365 you already trust** | Entra ID SSO, SharePoint, Teams, no third-party auth, no React SPA to maintain | Both |

---

## 5. Outcome statements (use as headlines)

**For CA firms**
- *"Cut audit cycle time by 40% — without changing how your team works in Tally."*
- *"Every workpaper, every sign-off, every exception — searchable, exportable, defensible."*
- *"Onboard a new client company in under 10 minutes. Including their Tally."*

**For SMB clients**
- *"Your books, your dashboards, your CA — on one screen. On your phone."*
- *"Send a bill on WhatsApp. It lands in your CA's queue, tagged and filed."*
- *"Tally on the cloud, with MFA and backups — without buying a server."*

---

## 6. Objections & responses

| Objection | Response |
|---|---|
| "We already use Tally on a local server." | Keep your Tally. We just put a secure cloud gateway in front so your team and your CA work on the same file from anywhere. |
| "Our staff won't change tools." | Nothing changes inside Tally. The platform sits around it — inbox, workpapers, dashboards, sign-off. |
| "Is our data safe?" | Microsoft 365 tenancy, Entra ID auth, row-level security in Dataverse and Power BI, SharePoint document store, encrypted backups. No third-party login. |
| "Too expensive for a small firm." | Start with the Tally Hosting bundle at ₹1,499/user/month. Add audit + Power BI when ready. |
| "We tried portals before — clients never log in." | They don't have to. Documents come in via WhatsApp, email and Telegram — already linked to the right client. |

---

## 7. Proof points / stats to cite

- 25 portal pages, 4 personas, 1 codebase
- 13 Power Automate flows, 16 exception rules, 56 audit procedures, 4 audit programs
- 5 subscription bundles, INR, 15% annual discount
- Built on Microsoft 365 — Power Pages, Dataverse, Power Automate, Power BI, Copilot Studio
- 1 Azure Function (RDP signing) — everything else is configuration, not custom code
- Backed by **Smartsoft — 29 years of trusted IT solutions**

---

## 8. Voice & tone

- Consultative, outcome-led, India-context (₹, GST, CA, Tally — no apology, no glossary).
- No superlatives without proof. Avoid "revolutionary", "world-class", "AI-powered" as standalone adjectives.
- Numbers > adjectives. "Cut review time by 40%" beats "dramatically faster reviews".
- Bilingual (English + Hinglish) only for WhatsApp broadcasts. Everything else: English.

---

## 9. CTAs (one of these, never invent new ones)

| Primary | Secondary |
|---|---|
| **Book a 20-min demo** → `mailto:sales@smartsoft.example` *(TODO: real)* | **Download the pricelist** → `pricelist/pricelist.html` |
| **Talk on WhatsApp** → `https://wa.me/91XXXXXXXXXX` *(TODO: real)* | **See it live** → `landing/index.html#how-it-works` |

---

## 10. Pricing summary (mirror of `power-platform/catalog/bundles.json`)

| Bundle | ₹/month | ₹/year (save 15%) | Unit |
|---|---:|---:|---|
| Tally Hosting | 1,499 | 14,990 | per user / month |
| M365 Integration | 999 | 9,990 | per company / month |
| Power Suite (BI + Query + Flows) | 1,799 | 17,990 | per company / month |
| Audit Suite | 2,499 | 24,990 | per company / month |
| **All-in-One** *(highlighted)* | **3,499** | **34,990** | per company / month |

GST extra. Volume discount > 25 companies. Implementation: 1-time, quoted on scope.
