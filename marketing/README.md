# Marketing — Smart Accounting Reports

Go-to-market kit for the Smartsoft **Smart Accounting Reports** (a.k.a. Accounts Delivery Platform) launch. Static assets only — no build step, no backend, served from the same `http-server` you already run for the preview harness.

---

## What's in here

```
marketing/
├── MESSAGING.md                  ← positioning, pillars, ICPs, taglines (READ FIRST)
├── README.md                     ← this file
├── assets/
│   └── README.md                 ← drop smartsoft-logo.png here
├── landing/
│   ├── index.html                ← public landing page
│   ├── landing.css               ← brand-aligned styles (black + #FFCB05)
│   └── landing.js                ← audience tab switcher
├── pricelist/
│   └── pricelist.html            ← printable A4 pricelist (browser → Print → PDF)
├── visual-map/
│   └── index.html                ← visual map deck (9 slides, keyboard-driven, brand styled)
├── social/
│   ├── linkedin.md               ← 5 long-form posts + 1 carousel + cadence
│   ├── twitter-x.md              ← 10 posts + a 6-tweet thread
│   ├── whatsapp-broadcast.md     ← 4 broadcasts + status one-liners (Eng + Hinglish)
│   ├── instagram-captions.md     ← 6 captions with visual cues
│   └── youtube-shorts-scripts.md ← 3 × 30-sec Short scripts
└── outreach/
    ├── email-ca-firms.md         ← 3-touch sequence to CA firm partners
    ├── email-smb.md              ← 3-touch sequence to SMB owners
    ├── cold-call-script.md       ← 60-sec opener + objection handlers
    ├── demo-deck-outline.md      ← 10-slide deck (build sheet, not slides)
    └── demo-script.md            ← click-by-click live demo runbook (preview harness)
```

---

## Preview locally

The repo's existing static server already covers it. If it's not running:

```pwsh
cd c:\Accounts-Delivery-Platform-New
npx http-server . -a 127.0.0.1 -p 5500 -c-1
```

Then open:

| Asset | URL |
|---|---|
| Landing page | http://127.0.0.1:5500/marketing/landing/ |
| Pricelist (printable) | http://127.0.0.1:5500/marketing/pricelist/pricelist.html |

For the pricelist PDF: open in browser → **Print** → **Save as PDF** (A4, no margins adjustment needed; print stylesheet is set).

---

## Customising before launch

1. **Logo** — drop `smartsoft-logo.png` into `marketing/assets/`. SVG variant optional. The pages already reference it and fall back to a wordmark if missing.
2. **Contact CTAs** — search-and-replace these two placeholders across the whole `marketing/` folder:
   - `sales@smartsoft.example` → real sales mailbox
   - `+91-XXXXX-XXXXX` and `https://wa.me/91XXXXXXXXXX` → real WhatsApp number
3. **Demo link** — `smartsoft.example/demo` referenced in social + outreach. Point to your Calendly/Outlook bookings page.
4. **Customer references** — Post 5 (LinkedIn) and Instagram caption 5 are marked `placeholder`. Swap when first reference closes.
5. **Pricelist version stamp** — top-right of `pricelist.html` says `v1.0 · Effective May 2026`. Update on price changes.

---

## Source-of-truth links

| Marketing file | Sourced from |
|---|---|
| `MESSAGING.md` pricing block | [bundles.json](../power-platform/catalog/bundles.json) |
| `pricelist/pricelist.html` numbers | [bundles.json](../power-platform/catalog/bundles.json) |
| Landing feature pillars | [docs/architecture.md](../docs/architecture.md), [docs/page-role-matrix.md](../docs/page-role-matrix.md) |
| Brand palette | [power-platform/portal/theme.json](../power-platform/portal/theme.json) (`#FFCB05` accent) |

**If you change pricing in `bundles.json`, also update**: `MESSAGING.md` §10, `pricelist/pricelist.html` (both the price table and matrix), `landing/index.html` (pricing teaser section), and `social/twitter-x.md` post 10.

---

## Posting cadence (suggested 6-week sprint)

| Week | LinkedIn | Twitter/X | WhatsApp | Email |
|---|---|---|---|---|
| 1 | Post 1 (launch) | Posts 1, 5, 9 | Broadcast 1 (CA) | Touch 1 (CA list) |
| 2 | Post 2 (12 days) | Posts 2, 7 | Broadcast 3 (SMB) | Touch 1 (SMB list) |
| 3 | Post 4 (architecture) | Posts 3, 6, 10 | Broadcast 2 (Hinglish CA) | Touch 2 (CA list) |
| 4 | Post 5 (carousel) | Thread (6 tweets) | Broadcast 4 (Hinglish SMB) | Touch 2 (SMB list) |
| 5 | Post 3 (owner story) | Posts 4, 8 | — | Touch 3 (CA list) |
| 6 | First customer reference | — | — | Touch 3 (SMB list) |

YouTube Shorts: drop one per week starting week 2.
