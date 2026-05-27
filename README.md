# Accounts Delivery Platform (ADP)

End-to-end delivery platform for accounting firms, built on Microsoft Power Platform (Dataverse, Power Pages, Power Automate, Power BI, Power Query) with Azure Functions and a static preview harness for fast iteration.

## What's inside

| Folder | Purpose |
| --- | --- |
| [`power-platform/portal/`](power-platform/portal/) | Power Pages site — Liquid pages, shell templates, FetchXML, theme, security model |
| [`power-platform/flows/`](power-platform/flows/) | Power Automate flow definitions (ingestion, onboarding, RDP launch, subscriptions, invites) |
| [`power-platform/power-query/`](power-platform/power-query/) | Power Query (M) scripts for bank statement, GST reconciliation, Tally extract |
| [`power-platform/catalog/`](power-platform/catalog/) | Subscription bundles + per-company Power BI report registry |
| [`power-platform/custom-connectors/`](power-platform/custom-connectors/) | OpenAPI specs for Telegram & WhatsApp custom connectors |
| [`power-platform/security/`](power-platform/security/) | Web role / table-permission YAML + sample users |
| [`power-platform/scripts/`](power-platform/scripts/) | `pac` CLI deploy / pull / push helpers |
| [`power-platform/solution/`](power-platform/solution/) | Exported Dataverse solution source |
| [`power-platform/portal-download/`](power-platform/portal-download/) | Power Pages source downloaded via `pac paportal download` |
| [`apps/rdp-function/`](apps/rdp-function/) | Azure Functions app — signed RDP file generator for Tally hosting |
| [`preview/`](preview/) | Static client-side harness that renders Liquid pages with stubbed Dataverse data |

## Local development

Three dev services back the preview workflow:

```pwsh
# 1. Static portal preview                  -> http://127.0.0.1:5500/preview/
npx http-server . -a 127.0.0.1 -p 5500 -c-1

# 2. Telegram embed proxy                   -> http://127.0.0.1:5501
node preview/tg-proxy.js

# 3. RDP Azure Functions host               -> http://localhost:7071
cd apps/rdp-function ; func start
```

Open http://127.0.0.1:5500/preview/, pick a page from the dropdown, switch the Role selector to render the persona-aware shell.

## Personas

- **Smartsoft Operator** — internal console (firms, catalog, connectors, health)
- **Firm Admin** — dashboard, clients, team, billing, settings
- **Accountant** — daily portfolio across all client companies
- **Client** — own inbox, documents, reports, engagements, subscription

## Deployment

See [`power-platform/LOCAL-PC-TESTING.md`](power-platform/LOCAL-PC-TESTING.md) and [`power-platform/scripts/`](power-platform/scripts/) for `pac` CLI–based deployment (solution + portal).

## Repositories

- Primary: https://github.com/psranjith/Accounting-Portal-Version1
- Backup mirror: https://github.com/psranjith/Accounting-Portal-Version2
