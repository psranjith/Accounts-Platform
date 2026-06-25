# ADP Portal — Page x Role Capability Matrix

The canonical contract: **what can each persona see and do on each page**. Phase C fine-tuning verifies every page against this matrix.

For "what is each page", see [usability.md](usability.md). For underlying layers and enforcement, see [architecture.md](architecture.md).

---

## Legend

| Symbol | Meaning |
|---|---|
| **F** | Full access — read + create + edit + state-transitioning actions |
| **E** | Edit own / assigned — read + edit own rows; cannot delete or sign-off |
| **R** | Read-only |
| **R\*** | Read-only, scoped to own company |
| **—** | Hidden (page or section not rendered for this persona) |
| **(sign)** | Sign-off / approve permission required (Manager / Partner) |

Persona codes: **OP** = Smartsoft Operator · **FA** = Firm Admin · **AC** = Accountant · **CL** = Client.

Scope qualifier in parentheses indicates the data slice the persona sees:
- *(all)* — every firm / every company
- *(firm)* — all companies of one firm
- *(assigned)* — only companies assigned via `adp_companyassignment`
- *(own)* — only their `adp_companyid`

---

## Master matrix

| Page | OP | FA | AC | CL |
|---|---|---|---|---|
| [index](../power-platform/portal/pages/index.liquid) (public) | F | F | F | F |
| [dashboard](../power-platform/portal/pages/dashboard.liquid) | F *(all)* | F *(firm)* | F *(assigned)* | R\* *(own)* |
| [clients](../power-platform/portal/pages/clients.liquid) | F *(all)* | F *(firm)* | R *(assigned)* | — |
| [inbox](../power-platform/portal/pages/inbox.liquid) | F *(all)* | F *(firm)* | E *(assigned)* | — |
| [service-delivery](../power-platform/portal/pages/service-delivery.liquid) | F *(all)* | F *(firm)* | R *(assigned)* | — |
| [insights](../power-platform/portal/pages/insights.liquid) | F *(all)* | F *(firm)* | R *(assigned)* | R\* *(own)* |
| [agents](../power-platform/portal/pages/agents.liquid) | F | F | F | R *(client bots only)* |
| [audit](../power-platform/portal/pages/audit.liquid) | F *(all)* | F *(firm)* | E *(assigned)* | R\* *(own)* |
| [audit-engagement](../power-platform/portal/pages/audit-engagement.liquid) | F *(all)* | F *(firm)* (sign Partner) | E *(assigned)* | R\* *(own)* |
| [workpaper](../power-platform/portal/pages/workpaper.liquid) | F *(all)* | F (sign Manager+Partner) | E *(own preparer)* | — |
| [audit-exceptions](../power-platform/portal/pages/audit-exceptions.liquid) | F *(all)* | F *(firm)* | E *(assigned)* | — |
| [client-requests](../power-platform/portal/pages/client-requests.liquid) | F *(all)* | F *(firm)* | E *(assigned)* | E *(own, upload only)* |
| [documents](../power-platform/portal/pages/documents.liquid) | F *(all)* | F *(firm)* | E *(assigned)* | E\* *(own, upload only)* |
| [launch-tally](../power-platform/portal/pages/launch-tally.liquid) | F | F | F *(assigned)* | — |
| [team](../power-platform/portal/pages/team.liquid) | F *(read all firms)* | F *(own firm)* | — | — |
| [teams](../power-platform/portal/pages/teams.liquid) | F | F *(firm)* | R *(firm)* | — |
| [billing](../power-platform/portal/pages/billing.liquid) | F *(all)* | F *(firm)* | R *(firm)* | E *(own subscription)* |
| [operator](../power-platform/portal/pages/operator.liquid) | F | — | — | — |
| Redirect stubs — [companies](../power-platform/portal/pages/companies.liquid) / [onboarding](../power-platform/portal/pages/onboarding.liquid) / [reports](../power-platform/portal/pages/reports.liquid) / [reports-company](../power-platform/portal/pages/reports-company.liquid) / [report-powerbi](../power-platform/portal/pages/report-powerbi.liquid) / [assistant](../power-platform/portal/pages/assistant.liquid) / [pricing](../power-platform/portal/pages/pricing.liquid) / [subscription](../power-platform/portal/pages/subscription.liquid) | redirect | redirect | redirect | redirect |

---

## Action-level matrix (the contract for Phase C)

Where the master grid shows F/E, the table below pins the specific actions that must be gated correctly.

### Audit module

| Action | OP | FA | AC | CL |
|---|---|---|---|---|
| **Start audit engagement** (`Flow_StartAuditEngagement`) | ✓ | ✓ | ✗ | ✗ |
| Run exception engine (`Flow_RunExceptionEngine`) | ✓ | ✓ | ✓ | ✗ |
| Open engagement | ✓ | ✓ | ✓ *(assigned)* | ✓ *(own)* |
| Edit engagement header (materiality, dates) | ✓ | ✓ | ✗ | ✗ |
| Advance engagement status | ✓ | ✓ | ✗ | ✗ |
| Create workpaper | ✓ | ✓ | ✓ *(assigned)* | ✗ |
| Edit workpaper as preparer | ✓ | ✓ | ✓ *(own)* | ✗ |
| Submit workpaper for review (`Flow_SubmitForReview`) | ✓ | ✓ | ✓ *(own)* | ✗ |
| **Sign off workpaper** — Manager (`Flow_SignOff`) | ✓ | ✓ | ✗ | ✗ |
| **Sign off workpaper** — Partner (`Flow_SignOff`) | ✓ | ✓ *(if Partner)* | ✗ | ✗ |
| Link exception to workpaper | ✓ | ✓ | ✓ *(assigned)* | ✗ |
| Resolve exception | ✓ | ✓ | ✓ *(assigned)* | ✗ |
| Create client request | ✓ | ✓ | ✓ *(assigned)* | ✗ |
| Upload to client request | ✓ | ✓ | ✓ *(assigned)* | ✓ *(own)* |
| Accept / reject client request | ✓ | ✓ | ✓ *(assigned)* | ✗ |
| Generate audit report (`Flow_GenerateAuditReport`) | ✓ | ✓ | ✗ | ✗ |
| Mark engagement Issued | ✓ | ✓ *(Partner)* | ✗ | ✗ |

### Clients & onboarding

| Action | OP | FA | AC | CL |
|---|---|---|---|---|
| Onboard new firm | ✓ | ✗ | ✗ | ✗ |
| Onboard new client (`Flow_OnboardCompany`) | ✓ | ✓ | ✗ | ✗ |
| Invite user (`Flow_InviteUser`) | ✓ | ✓ | ✗ | ✗ |
| Assign accountant to company | ✓ | ✓ | ✗ | ✗ |
| Edit client profile | ✓ | ✓ | ✗ | ✗ |
| Edit own client profile | — | — | — | ✓ *(limited fields)* |

### Inbox / documents

| Action | OP | FA | AC | CL |
|---|---|---|---|---|
| View incoming docs | ✓ *(all)* | ✓ *(firm)* | ✓ *(assigned)* | ✗ |
| Classify doc | ✓ | ✓ | ✓ *(assigned)* | ✗ |
| Link doc to engagement / workpaper | ✓ | ✓ | ✓ *(assigned)* | ✗ |
| Upload document to SharePoint | ✓ | ✓ | ✓ *(assigned)* | ✓ *(own)* |
| Download document | ✓ | ✓ | ✓ *(assigned)* | ✓ *(own)* |

### Insights / Power BI

| Action | OP | FA | AC | CL |
|---|---|---|---|---|
| View any company report | ✓ | ✓ *(firm)* | ✓ *(assigned)* | ✓ *(own — RLS)* |
| Edit report catalog (`catalog/powerbi-reports.json`) | ✓ | ✗ | ✗ | ✗ |

### Billing

| Action | OP | FA | AC | CL |
|---|---|---|---|---|
| View bundle / entitlements | ✓ | ✓ *(firm)* | ✓ *(firm)* | ✓ *(own)* |
| Change plan (`Flow_ManageSubscription`) | ✓ | ✓ | ✗ | ✓ *(own)* |
| Edit bundle catalog (`catalog/bundles.json`) | ✓ | ✗ | ✗ | ✗ |

### Tools

| Action | OP | FA | AC | CL |
|---|---|---|---|---|
| Launch Tally (mint signed `.rdp`) | ✓ | ✓ | ✓ *(assigned)* | ✗ |
| Open Copilot bot | ✓ | ✓ | ✓ | ✓ *(client-facing bots)* |
| Open Teams chat with colleague | ✓ | ✓ *(firm)* | ✓ *(firm)* | ✗ |

### Operator console

| Action | OP | FA | AC | CL |
|---|---|---|---|---|
| Anything on `operator.liquid` | ✓ | — | — | — |
| Edit catalog JSON (programs / procedures / bundles / rules) | ✓ | — | — | — |
| Restart custom connector | ✓ | — | — | — |
| Toggle feature flag (`adp_config`) | ✓ | — | — | — |

---

## Left-rail navigation per persona

Each persona sees a different left rail (defined in [adp-shell-open.liquid](../power-platform/portal/templates/adp-shell-open.liquid)). This matrix is the source of truth.

| Rail item | OP | FA | AC | CL |
|---|---|---|---|---|
| 🏠 Dashboard / ☀ My Day / 🏠 Home | ✓ | ✓ | ✓ (My Day) | ✓ (Home) |
| 🏢 Clients | ✓ | ✓ | ✓ | — |
| 👥 Team | — | ✓ | — | — |
| 📧 Inbox | ✓ | ✓ | ✓ | ✓ |
| 📋 Service Delivery / Engagements | ✓ | ✓ | ✓ | ✓ (Engagements view) |
| 🔍 Audit | ✓ | ✓ | ✓ | ✓ |
| 📈 Insights / Reports | ✓ | ✓ | ✓ | ✓ |
| 📁 Documents | — | — | ✓ | ✓ |
| 💻 Launch Tally | — | ✓ | ✓ | — |
| 🤖 Agents / 💬 Support | ✓ | ✓ | ✓ | ✓ |
| 💬 Teams | ✓ | ✓ | ✓ | — |
| 💳 Billing / Subscription | ✓ | ✓ | — | ✓ |
| ⚙ Settings / Operator | ✓ | ✓ (Settings only) | — | — |

---

## Verification checklist (Phase C smoke test)

For each page touched, switch through all 4 personas in the preview and verify:

1. The page renders without console errors.
2. Hidden sections per the master grid are actually hidden (Liquid `{% if %}`).
3. F/E actions per the action grid are present and invoke the right flow / FetchXML.
4. Read-only personas have no edit affordances (no input boxes, no save buttons).
5. Data scope matches the qualifier — Client never sees another company's row even if the URL is hand-edited (Power Pages table permissions enforce this in production; preview stubs simulate it).
6. The left rail matches the navigation matrix for that persona.
