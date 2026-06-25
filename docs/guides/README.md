# ADP Portal — User Guides

End-user and internal guides for the Accounts Delivery Platform (ADP). These
are **task-oriented** documents: how to actually use the platform, persona by
persona. For system design see [../architecture.md](../architecture.md); for the
access contract see [../page-role-matrix.md](../page-role-matrix.md); for the
dev simulator see [../preview-harness.md](../preview-harness.md).

---

## Start here

| If you are… | Read |
|---|---|
| New to the platform | [product-walkthrough.md](product-walkthrough.md) — the end-to-end journey |
| A firm partner / principal | [quick-start-firm-admin.md](quick-start-firm-admin.md) |
| An accountant / audit staff | [quick-start-accountant.md](quick-start-accountant.md) |
| A client (business owner / finance) | [quick-start-client.md](quick-start-client.md) |
| Smartsoft internal / support | [quick-start-operator.md](quick-start-operator.md) |
| Looking up what a page does | [page-reference.md](page-reference.md) |

---

## The four personas

| Persona | Scope | What they do |
|---|---|---|
| **Smartsoft Operator** | All firms, all companies | Onboard firms, manage the catalog/connectors, monitor platform health |
| **Firm Admin** (Partner/Principal) | All companies of their firm | Onboard clients, invite users, assign staff, start & sign off audits, manage billing |
| **Accountant** (Staff) | Only assigned companies | Capture documents, execute workpapers, manage exceptions, handle client requests |
| **Client** (External) | Their own company only | View audit status & dashboards, upload requested documents, manage subscription |

Access is enforced in four layers — Liquid UI gating, FetchXML per-company
filters, Power Pages table permissions, and Power BI row-level security. The
exact capability per page lives in [../page-role-matrix.md](../page-role-matrix.md).

---

## How to follow along

These guides are written against the live portal, but you can practise every
step in the **preview harness** with stubbed data — no login or Dataverse
required. To run it locally:

```pwsh
# 1. Static portal preview   -> http://127.0.0.1:5500/preview/
npx http-server . -a 127.0.0.1 -p 5500 -c-1

# 2. Telegram embed proxy     -> http://127.0.0.1:5501
node preview/tg-proxy.js

# 3. RDP Azure Functions host -> http://localhost:7071
cd apps/rdp-function ; func start
```

Open <http://127.0.0.1:5500/preview/>, pick a page from the **Page** dropdown,
and switch the **Role** dropdown to see the same page as each persona.
