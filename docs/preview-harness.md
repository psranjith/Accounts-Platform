# ADP Portal — Preview Harness

The **preview harness** under [preview/](../preview/) is a static client-side simulator that renders every Power Pages `.liquid` file with stubbed Dataverse data, so we can iterate on layout, navigation, and role gating **without deploying to Power Pages**. It is the fastest dev loop in the repo and the canonical place to reproduce / fix UI issues before they ever touch Dataverse.

It is **dev-only** — nothing in `preview/` is deployed. Production rendering happens in Power Pages.

---

## 1. Run it locally

```powershell
# from the repo root
cd preview
npx http-server -p 5500
# in another terminal — Telegram proxy (optional, only for tg.html)
node tg-proxy.js
# in another terminal — Azure Function for Launch Tally
cd ..\apps\rdp-function
func start
```

Open `http://127.0.0.1:5500/preview/`. Three controls in the top bar:

| Control | Purpose |
|---|---|
| **Page** dropdown | Pick which `.liquid` to render. Populated from `PAGES` in [preview.js](../preview/preview.js). |
| **Role** dropdown | Switch persona (`Smartsoft Operator` / `Firm Admin` / `Accountant` / `Client`). Re-renders the current page. |
| **Signed in** checkbox | Toggles `user.id` truthiness so partials like `adp-user-context` fire their auth-gated FetchXML. |
| *Sign in to M365* button | Optional MSAL sign-in for live Entra context. |

The harness does **not** require any login to render pages.

---

## 2. How rendering works

[`preview/preview.js`](../preview/preview.js) is the entire harness in one file. Key sections:

| Range | What it does |
|---|---|
| `PAGES` (~lines 5–33) | Registry: page id → label → `.liquid` file path. Order = dropdown order. |
| `PARTIALS` (~lines 35–40) | Map of partial names → file paths. Only three partials are supported (the shared shell). |
| `engine` (line ~42) | LiquidJS instance with `strictFilters: false`, `strictVariables: false`. |
| `json` filter (lines ~47–52) | Polyfill of the Power Pages `json` filter (LiquidJS doesn't ship one). |
| Custom tags (lines ~54–120) | Stubs for `{% fetchxml %}`, `{% entityform %}`, `{% entitylist %}`, `{% powerbi %}`, `{% redirect %}`, etc. |
| `pickFetchXmlStub(varname, fetchXml, ctx)` (~lines 130–565) | The heart of the harness — pattern-matches the FetchXML body against the outer `<entity name="...">` and returns hardcoded rows. |
| `renderPage(pageId)` (~lines 595–660) | Loads the page, inlines partials, builds the data context, runs `engine.parseAndRender`, mounts to `#renderTarget`. |
| `rewriteInternalLinks` / `PATH_TO_PAGE` (~lines 660–720) | Rewrites Power Pages absolute URLs (`/audit`, `/clients`) into preview deep-links (`?page=audit`). |
| `originalFetch` override (~lines 720–760) | Intercepts calls to `preview://stub/api/rdp/generate` so Launch Tally works without the function app. |
| MSAL init (~lines 760+) | Optional sign-in to populate `msalAccount` with a real Entra OID. |

### Render pipeline

```
renderPage(pageId)
  ├─ fetchText(page.file)                       — load the .liquid source
  ├─ scan for {% include 'name' %}              — supports our three partials
  ├─ fetchText each partial (cached)
  ├─ string-replace include calls with bodies   — LiquidJS in-browser has no FS
  ├─ build `data` context: { __role, user, request, adp_powerbi_*, adp_rdp* }
  └─ engine.parseAndRender(inlined, data)
        ├─ {% fetchxml var %} ... {% endfetchxml %}
        │     ├─ render the inner Liquid (so {{ adp_companyid }} resolves)
        │     ├─ pickFetchXmlStub(var, renderedXml, ctx) → {results:{entities:[…]}}
        │     └─ ctx.environments[var] = stub
        └─ output HTML into #renderTarget
```

### The `{% fetchxml %}` tag (read this if you write or fix stubs)

The tag captures its body, **renders it through Liquid first**, then hands the resulting XML to `pickFetchXmlStub`. This matters because pages emit FetchXML like:

```xml
<fetch ...>
  <entity name="adp_workpaper">
    ...
    {% unless is_operator or is_accountant %}
    <link-entity name="adp_auditengagement" from="adp_auditengagementid" to="adp_auditengagementid">
      <filter><condition attribute="adp_companyid" operator="eq" value="{{ adp_companyid }}" /></filter>
    </link-entity>
    {% endunless %}
  </entity>
</fetch>
```

The `{% unless %}` and `{{ adp_companyid }}` must be resolved **before** the stub's regex tests run, otherwise the stub matches literal `value="{{ adp_companyid }}"` and filters to zero rows. (This was a real bug — see commit history around Phase B.)

---

## 3. Stub catalog (`pickFetchXmlStub`)

The stub function pattern-matches on the **outer entity name** (`<entity\s+name="adp_X">`) and returns deterministic test data. **Never** match on `adp_X\b` alone — that also matches `<link-entity name="adp_X">` references in other queries and routes them to the wrong stub.

Currently stubbed entities (with stable test data):

| Entity | Rows | Notes |
|---|---|---|
| `adp_company` | 5 | Acme, Beta, Gamma, Delta, Epsilon. GUIDs are `000…0001` through `000…0005`. |
| `adp_appuser` | 1 | Returns Priya Sharma at Acme; role comes from `ctx.environments.__role`. |
| `adp_companyassignment` | 8 | Maps staff → companies for the Accountant scope. |
| `adp_auditengagement` | 4 | aud-001 Acme STAT-FY · aud-002 Beta GST-9C · aud-003 Gamma ICR · aud-004 Delta TAX-44AB. |
| `adp_workpaper` | 5 | wp-001..wp-004 on aud-001; wp-005 on aud-002. |
| `adp_evidence` | 4 | Attached to wp-001..wp-003. |
| `adp_sample` | 3 | Attached to wp-001. |
| `adp_review` | 2 | Manager + Partner sign-off on wp-003. |
| `adp_exception` | 7 | Across aud-001..aud-003. |
| `adp_clientrequest` | 5 | Across aud-001..aud-003. |
| `adp_auditlog` | 4 | Activity on aud-001. |
| `adp_auditprogram` | 4 | STAT-FY · GST-9C · ICR · TAX-44AB. |

**Filter regexes the stubs honor:**

```js
/adp_<entity>id"\s+operator="eq"\s+value="([^"]+)"/i    // pin by primary key
/adp_auditengagementid"\s+operator="eq"\s+value="([^"]+)"/i  // child filter
/adp_companyid"\s+operator="eq"\s+value="([^"]+)"/i     // direct OR via link-entity
```

For child entities that don't carry `adp_companyid` (workpaper / exception / clientrequest), the stub uses an `engagementsForCompany(companyId)` helper to map company GUID → engagement IDs, mirroring how Power Pages would resolve the link-entity filter.

---

## 4. Adding a new page

1. Add the `.liquid` file under [power-platform/portal/pages/](../power-platform/portal/pages/) — it must include the standard shell:

   ```liquid
   {% include 'adp-user-context' %}
   {% include 'adp-shell-open' %}
     <!-- page content -->
   {% include 'adp-shell-close' %}
   ```

2. Register it in [preview/preview.js](../preview/preview.js) `PAGES` array:

   ```js
   { id: 'my-page', label: 'My new page', file: '../power-platform/portal/pages/my-page.liquid' },
   ```

3. Add the same id to `PATH_TO_PAGE` so `<a href="/my-page">` links rewrite correctly.

4. Reload `http://127.0.0.1:5500/preview/?page=my-page` and switch through all 4 roles.

---

## 5. Adding a new FetchXML stub

When a new page queries an entity that currently returns `entities: []` (the default fallback at the end of `pickFetchXmlStub`), add a new block. Follow the established pattern:

```js
if (/<entity\s+name="adp_myentity"/i.test(fetchXml)) {
  const all = [
    { adp_myentityid: 'me-001', adp_companyid: { id: '00000000-0000-0000-0000-000000000001', name: 'Acme...' }, /* ...fields the page reads... */ },
    // 2-5 rows is usually enough
  ];
  // by primary key
  const m = fetchXml.match(/adp_myentityid"\s+operator="eq"\s+value="([^"]+)"/i);
  if (m) return { results: { entities: all.filter(x => x.adp_myentityid === m[1]) } };
  // by company (direct or via link-entity)
  const cm = fetchXml.match(/adp_companyid"\s+operator="eq"\s+value="([^"]+)"/i);
  if (cm) return { results: { entities: all.filter(x => x.adp_companyid && x.adp_companyid.id === cm[1]) } };
  return { results: { entities: all } };
}
```

**Rules of the road:**

- **Always anchor entity detection to `<entity\s+name="...">`**, never to `\badp_xxx\b`. Otherwise the stub will fire for sibling queries that happen to reference your entity via `<link-entity>`.
- Use the same GUIDs as the company stub (`00000000-0000-0000-0000-00000000000N`) so cross-entity scoping works.
- Mirror the Dataverse shape: lookups are `{ id, name }`, optionsets are `{ label }`.
- Insert your block **before** the closing `return { results: { entities: [] } };` and after any sibling stubs whose names are prefixes of yours.

---

## 6. Liquid filter / tag gaps to watch

LiquidJS in-browser is missing several Power Pages / Shopify filters. We polyfill on demand:

| Filter | Status in this harness | Workaround |
|---|---|---|
| `json` | Polyfilled (line ~47) | — |
| `where_exp` | **Not available** in browser LiquidJS | Filter in FetchXML or precompute as a Liquid `{% capture %}` loop. |
| `push` | **Not available** | Use `{% assign list = list \| concat: array_of_one %}` with array literals (`(item)` syntax can be flaky — prefer FetchXML-level scoping). |
| `entityform` / `entitylist` | Rendered as a `<div class="placeholder">` | These are server-rendered Power Pages controls; only the placeholder appears in preview. |
| `powerbi` | Placeholder card | Real embed needs a token from Power BI Embedded service. |
| `redirect` | Sets `window.location` after render | OK for the redirect stub pages. |

When you hit a filter LiquidJS doesn't ship, **first** try to move the logic into the FetchXML layer — it works in both preview and production with no shimming, and the Audit-page bug we fixed in Phase B is the cautionary tale for trying to filter in Liquid instead.

---

## 7. Gotchas

- **Role labels are case-sensitive.** The dropdown emits `"Smartsoft Operator"`, `"Firm Admin"`, `"Accountant"`, `"Client"` — exactly as `adp-user-context.liquid` expects to downcase-map them. Don't rename labels without updating the partial.
- **`user.id` truthiness gates `adp-user-context`'s FetchXML.** If you uncheck *Signed in*, `adp_companyid` will be empty and any page that filters on it will show empty data. This mirrors production.
- **Stub matching order matters.** `pickFetchXmlStub` is a sequence of `if (...) return` blocks. If two stubs could match the same XML, the first wins. Order child entities **before** their parent or anchor regexes tightly.
- **Default fallback is `entities: []`.** New pages whose entity has no stub will render empty without error — they silently look broken. Add a stub or at minimum a stub that returns 2-3 placeholder rows so the layout is testable.
- **`PATH_TO_PAGE` is the dead-link defence.** Any `<a href="/something">` that has no entry in `PATH_TO_PAGE` rewrites to `#` and fails silently. After adding a page, also add the path.
- **Inline `<script>` blocks** must work through the `executeInlineScripts()` re-mount — anything that runs on `DOMContentLoaded` will not fire (the document has already loaded). Use `IIFE` or `setTimeout(..., 0)`.
- **CSS source-order shim.** `promoteDesignSystem()` re-appends `preview.css` to the end of `<body>` after every render so the design system wins at equal specificity. Don't add stylesheet `<link>`s inside `.liquid` pages — put them in `preview.css`.

---

## 8. When the harness lies

The harness is intentionally a thin simulator. These things differ from production and need to be verified in a real Power Pages environment before shipping:

1. **Table permissions** — preview doesn't enforce them; only Liquid `{% if %}` blocks gate visibility here. A page that "works" in preview but doesn't gate sensitive sections will still fail server-side in production, but not in a way preview catches.
2. **`{% entityform %}` / `{% entitylist %}`** — placeholders in preview. Verify the real form/list rendering in a portal sandbox.
3. **Power BI embed** — placeholder. Verify RLS in a real workspace.
4. **Copilot WebChat** — placeholder iframe. Use the Copilot Studio test pane.
5. **SharePoint document libraries** — stubbed. Verify in the live portal with the right site permissions.
6. **Flow triggers** — every button that says "→ Flow_X" is a no-op in preview. Verify via Power Automate run history.

For anything in the list above, treat preview as "the layout looks right" rather than "the feature works".
