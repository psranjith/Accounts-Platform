// Static client-side preview of Power Pages Liquid templates.
// Renders each .liquid page with stubbed Dataverse data using LiquidJS.

const PAGES = [
  // ---- Primary hubs (new IA) ---------------------------------------------
  { id: 'dashboard',        label: 'Dashboard / My Day',         file: '../power-platform/portal/pages/dashboard.liquid' },
  { id: 'clients',          label: 'Clients (hub)',              file: '../power-platform/portal/pages/clients.liquid' },
  { id: 'inbox',            label: 'Inbox (Data Capture)',       file: '../power-platform/portal/pages/inbox.liquid' },
  { id: 'service-delivery', label: 'Service Delivery',           file: '../power-platform/portal/pages/service-delivery.liquid' },
  { id: 'monthly-close',    label: 'Monthly Close (BPO)',         file: '../power-platform/portal/pages/monthly-close.liquid' },
  { id: 'accounting',       label: 'Accounting Activities',       file: '../power-platform/portal/pages/accounting.liquid' },
  { id: 'important-dates',  label: 'Important Dates',             file: '../power-platform/portal/pages/important-dates.liquid' },
  { id: 'insights',         label: 'Insights (Reports hub)',     file: '../power-platform/portal/pages/insights.liquid' },
  { id: 'agents',           label: 'Agents (incl. Smart Agent)', file: '../power-platform/portal/pages/agents.liquid' },
  { id: 'audit',            label: 'Audit (hub)',                file: '../power-platform/portal/pages/audit.liquid' },
  { id: 'audit-engagement', label: 'Audit engagement detail',    file: '../power-platform/portal/pages/audit-engagement.liquid' },
  { id: 'workpaper',        label: 'Workpaper',                  file: '../power-platform/portal/pages/workpaper.liquid' },
  { id: 'audit-exceptions', label: 'Audit exceptions inbox',     file: '../power-platform/portal/pages/audit-exceptions.liquid' },
  { id: 'client-requests',  label: 'Client requests (PBC)',      file: '../power-platform/portal/pages/client-requests.liquid' },
  { id: 'billing',          label: 'Billing (Plans + Subscription)', file: '../power-platform/portal/pages/billing.liquid' },
  { id: 'operator',         label: 'Operator Console (Smartsoft)', file: '../power-platform/portal/pages/operator.liquid' },
  { id: 'team',             label: 'Team (Firm user mgmt)',      file: '../power-platform/portal/pages/team.liquid' },
  // ---- Secondary / utilities --------------------------------------------
  { id: 'documents',        label: 'Documents',                  file: '../power-platform/portal/pages/documents.liquid' },
  { id: 'launch-tally',     label: 'Launch Tally',               file: '../power-platform/portal/pages/launch-tally.liquid' },
  { id: 'teams',            label: 'Microsoft Teams',            file: '../power-platform/portal/pages/teams.liquid' },
  { id: 'index',            label: 'Home (public landing)',      file: '../power-platform/portal/pages/index.liquid' }
];

const PARTIALS = {
  'adp-user-context': '../power-platform/portal/templates/adp-user-context.liquid',
  'adp-shell-open':   '../power-platform/portal/templates/adp-shell-open.liquid',
  'adp-shell-close':  '../power-platform/portal/templates/adp-shell-close.liquid'
};
const PARTIAL_USER_CONTEXT = PARTIALS['adp-user-context']; // back-compat

const engine = new liquidjs.Liquid({ jekyllInclude: false, strictFilters: false, strictVariables: false });

// Inline-script-safe JSON serialization. Power Pages' Liquid implementation
// ships a `json` filter; LiquidJS does not. Without this, expressions like
// `var x = {{ value | json }};` render unquoted and break inline <script> blocks.
engine.registerFilter('json', (v) => {
  const s = JSON.stringify(v === undefined ? null : v);
  // Escape </script> safely in case the value contains it.
  return (s === undefined ? 'null' : s).replace(/<\/(script)/gi, '<\\/$1');
});

// --- Stub Power Pages tags ----------------------------------------------------
// {% fetchxml var %} ... {% endfetchxml %}  -> assigns stubbed result for known queries
engine.registerTag('fetchxml', {
  parse(tagToken, remainTokens) {
    this.varname = tagToken.args.trim();
    this.tokens = [];
    let tok;
    while ((tok = remainTokens.shift())) {
      if (tok.name === 'endfetchxml') return;
      this.tokens.push(tok);
    }
    throw new Error('fetchxml tag not closed');
  },
  render: async function (ctx) {
    const raw = this.tokens.map(t => t.getText()).join('');
    // Render Liquid inside the FetchXML body so {% if %} / {{ var }} are resolved
    // before stub matching (mirrors Power Pages behavior where FetchXML supports Liquid).
    let inner = raw;
    try { inner = await engine.parseAndRender(raw, ctx.getAll()); } catch (e) { /* fall back to raw */ }
    const stub = pickFetchXmlStub(this.varname, inner, ctx);
    ctx.environments[this.varname] = stub;
    return '';
  }
});

// {% entityform name: 'x' %}
engine.registerTag('entityform', {
  parse(tagToken) { this.args = tagToken.args; },
  render() {
    return `<div class="placeholder"><strong>Power Pages entityform</strong> — ${escapeHtml(this.args)}<br/><em>Dataverse form rendered in the live portal.</em></div>`;
  }
});

// {% entitylist name: 'x' %}
engine.registerTag('entitylist', {
  parse(tagToken) { this.args = tagToken.args; },
  render() {
    return `<div class="placeholder"><strong>Power Pages entitylist</strong> — ${escapeHtml(this.args)}<br/><em>Dataverse list rendered in the live portal.</em></div>`;
  }
});

// {% powerbi authentication_type:"..." path:"..." roles:"..." username:"..." %}
engine.registerTag('powerbi', {
  parse(tagToken) { this.args = tagToken.args; },
  render() {
    const path = (this.args.match(/path\s*:\s*"([^"]+)"/) || [])[1] || '';
    const auth = (this.args.match(/authentication_type\s*:\s*"([^"]+)"/) || [])[1] || '';
    const roles = (this.args.match(/roles\s*:\s*"([^"]*)"/) || [])[1] || '';
    const username = (this.args.match(/username\s*:\s*"([^"]*)"/) || [])[1] || '';
    return `<div class="placeholder">
      <strong>Power Pages Power BI embed</strong><br/>
      <em>Renders the actual report only in the deployed Power Pages site.</em><br/>
      Path: <code>${escapeHtml(path)}</code><br/>
      Auth: <code>${escapeHtml(auth)}</code> &middot; Roles: <code>${escapeHtml(roles) || '(none)'}</code> &middot; Username/RLS key: <code>${escapeHtml(username) || '(none)'}</code>
    </div>`;
  }
});

// --- Stubbed data resolver ----------------------------------------------------
function pickFetchXmlStub(varname, fetchXml, ctx) {
  if (/adp_appuser/i.test(fetchXml)) {
    const role = ctx.environments.__role || 'Accountant';
    // Team-page query: returns a small firm team roster.
    // Distinguished from the single-user context query (which filters by
    // adp_entraobjectid) so the role selector keeps driving the persona.
    if (/adp_jobfunction/i.test(fetchXml) && !/adp_entraobjectid/i.test(fetchXml)) {
      return {
        results: {
          entities: [
            { adp_appuserid: 'usr-001', adp_name: 'Priya Menon',  adp_email: 'priya@smartsoftbooks.in',  adp_jobfunction: 'firmadmin',  adp_role: 'ADP Firm Admin',  adp_status: 'Active',   adp_invitedon: '2024-08-20', adp_lastloginon: '2026-05-30', adp_firmid: { id: 'firm-001', name: 'Smartsoft Books LLP' } },
            { adp_appuserid: 'usr-002', adp_name: 'Arjun Rao',    adp_email: 'arjun@smartsoftbooks.in',  adp_jobfunction: 'accountant', adp_role: 'ADP Accountant',  adp_status: 'Active',   adp_invitedon: '2024-09-02', adp_lastloginon: '2026-05-31', adp_firmid: { id: 'firm-001', name: 'Smartsoft Books LLP' } },
            { adp_appuserid: 'usr-003', adp_name: 'Neha Shah',    adp_email: 'neha@smartsoftbooks.in',   adp_jobfunction: 'accountant', adp_role: 'ADP Accountant',  adp_status: 'Active',   adp_invitedon: '2024-11-15', adp_lastloginon: '2026-05-29', adp_firmid: { id: 'firm-001', name: 'Smartsoft Books LLP' } },
            { adp_appuserid: 'usr-004', adp_name: 'Vikram Singh', adp_email: 'vikram@smartsoftbooks.in', adp_jobfunction: 'accountant', adp_role: 'ADP Accountant',  adp_status: 'Pending',  adp_invitedon: '2026-05-25', adp_lastloginon: null,        adp_firmid: { id: 'firm-001', name: 'Smartsoft Books LLP' } },
            { adp_appuserid: 'usr-005', adp_name: 'Meera Iyer',   adp_email: 'meera@smartsoftbooks.in',  adp_jobfunction: 'accountant', adp_role: 'ADP Accountant',  adp_status: 'Disabled', adp_invitedon: '2024-06-10', adp_lastloginon: '2025-12-04', adp_disabledon: '2026-01-15', adp_firmid: { id: 'firm-001', name: 'Smartsoft Books LLP' } },
            { adp_appuserid: 'usr-006', adp_name: 'Aisha Khan',   adp_email: 'aisha@acmetraders.com',    adp_jobfunction: 'client',     adp_role: 'ADP Client User', adp_status: 'Active',   adp_invitedon: '2025-02-12', adp_lastloginon: '2026-05-28', adp_firmid: { id: 'firm-001', name: 'Smartsoft Books LLP' } }
          ]
        }
      };
    }
    // Default single-user context query (adp-user-context.liquid).
    return {
      results: {
        entities: [{
          adp_appuserid: 'usr-001',
          adp_companyid: { id: '00000000-0000-0000-0000-000000000001', name: 'Acme Traders Pvt Ltd' },
          adp_firmid: { id: 'firm-001', name: 'Smartsoft Books LLP' },
          adp_role: { label: role, value: 1 },
          adp_jobfunction: { label: (role || '').toLowerCase().includes('operator') ? 'operator' : (role || '').toLowerCase().includes('firm admin') ? 'firmadmin' : (role || '').toLowerCase().includes('client') ? 'client' : 'accountant' },
          adp_status: { label: 'Active' },
          'company.adp_sharepointsiteurl': 'https://intelliblend.sharepoint.com/sites/Smartsoft646',
          'firm.adp_name': 'Smartsoft Books LLP'
        }]
      }
    };
  }
  if (/adp_powerbireport/i.test(fetchXml)) {
    return { results: { entities: [] } };
  }
  if (/adp_company\b/i.test(fetchXml)) {
    return { results: { entities: [
      { adp_companyid: '00000000-0000-0000-0000-000000000001', adp_name: 'Acme Traders Pvt Ltd' },
      { adp_companyid: '00000000-0000-0000-0000-000000000002', adp_name: 'Beta Industries' },
      { adp_companyid: '00000000-0000-0000-0000-000000000003', adp_name: 'Gamma Foods LLP' },
      { adp_companyid: '00000000-0000-0000-0000-000000000004', adp_name: 'Delta Logistics' },
      { adp_companyid: '00000000-0000-0000-0000-000000000005', adp_name: 'Epsilon Retail' }
    ]}};
  }
  if (/adp_firm\b/i.test(fetchXml)) {
    return { results: { entities: [
      { adp_firmid: 'firm-001', adp_name: 'Smartsoft Books LLP',  adp_plan: { label: 'Premium' }, adp_clients: 23, adp_accountants: 12, adp_status: { label: 'Active' }, adp_createdon: '2024-08-14', adp_country: 'India' },
      { adp_firmid: 'firm-002', adp_name: 'Northstar Accountants', adp_plan: { label: 'Standard' }, adp_clients: 8,  adp_accountants: 4,  adp_status: { label: 'Active' }, adp_createdon: '2025-03-02', adp_country: 'India' },
      { adp_firmid: 'firm-003', adp_name: 'Quill & Ledger',        adp_plan: { label: 'Trial'    }, adp_clients: 2,  adp_accountants: 1,  adp_status: { label: 'Trial'  }, adp_createdon: '2026-05-10', adp_country: 'India' }
    ]}};
  }
  if (/adp_subscription/i.test(fetchXml)) {
    const role = ctx.environments.__role || 'Accountant';
    if (role === 'Accountant') {
      return {
        results: {
          entities: [
            { adp_subscriptionid: 'sub-001', adp_companyid: { id: '00000000-0000-0000-0000-000000000001', name: 'Acme Traders Pvt Ltd' },     adp_bundleid: 'all-in-one',       adp_status: { label: 'Active'    }, adp_billingcycle: { label: 'Annual'  }, adp_quantity: 5,  adp_amount: 34990, adp_currentperiodstart: '2026-04-01', adp_currentperiodend: '2027-03-31' },
            { adp_subscriptionid: 'sub-002', adp_companyid: { id: '00000000-0000-0000-0000-000000000002', name: 'Beta Industries'       },     adp_bundleid: 'tally-hosting',    adp_status: { label: 'Active'    }, adp_billingcycle: { label: 'Monthly' }, adp_quantity: 3,  adp_amount:  4497, adp_currentperiodstart: '2026-05-01', adp_currentperiodend: '2026-05-31' },
            { adp_subscriptionid: 'sub-003', adp_companyid: { id: '00000000-0000-0000-0000-000000000003', name: 'Gamma Foods LLP'       },     adp_bundleid: 'm365-integration', adp_status: { label: 'Trialing'  }, adp_billingcycle: { label: 'Monthly' }, adp_quantity: 1,  adp_amount:   999, adp_currentperiodstart: '2026-05-20', adp_currentperiodend: '2026-06-19' },
            { adp_subscriptionid: 'sub-004', adp_companyid: { id: '00000000-0000-0000-0000-000000000004', name: 'Delta Logistics'      },     adp_bundleid: 'power-suite',      adp_status: { label: 'Past Due'  }, adp_billingcycle: { label: 'Monthly' }, adp_quantity: 2,  adp_amount:  2998, adp_currentperiodstart: '2026-04-15', adp_currentperiodend: '2026-05-14' },
            { adp_subscriptionid: 'sub-005', adp_companyid: { id: '00000000-0000-0000-0000-000000000005', name: 'Epsilon Retail'       },     adp_bundleid: 'starter',          adp_status: { label: 'Active'    }, adp_billingcycle: { label: 'Monthly' }, adp_quantity: 1,  adp_amount:   499, adp_currentperiodstart: '2026-05-10', adp_currentperiodend: '2026-06-09' },
            { adp_subscriptionid: 'sub-006', adp_companyid: { id: '00000000-0000-0000-0000-000000000006', name: 'Zeta Constructions'   },     adp_bundleid: 'all-in-one',       adp_status: { label: 'Cancelled' }, adp_billingcycle: { label: 'Annual'  }, adp_quantity: 4,  adp_amount: 27992, adp_currentperiodstart: '2025-08-01', adp_currentperiodend: '2026-07-31' }
          ]
        }
      };
    }
    return {
      results: {
        entities: [
          { adp_subscriptionid: 'sub-001', adp_bundleid: 'all-in-one', adp_status: { label: 'Active' }, adp_billingcycle: { label: 'Annual' }, adp_quantity: 5, adp_amount: 34990, adp_currentperiodstart: '2026-04-01', adp_currentperiodend: '2027-03-31' }
        ]
      }
    };
  }
  if (/adp_invoice/i.test(fetchXml)) {
    return {
      results: {
        entities: [
          { adp_number: 'INV-2026-0407', adp_issuedon: '2026-04-01', adp_amount: 34990, adp_status: { label: 'Paid'    }, adp_pdfurl: '#' },
          { adp_number: 'INV-2026-0312', adp_issuedon: '2026-03-01', adp_amount:  2916, adp_status: { label: 'Paid'    }, adp_pdfurl: '#' },
          { adp_number: 'INV-2026-0215', adp_issuedon: '2026-02-01', adp_amount:  2916, adp_status: { label: 'Paid'    }, adp_pdfurl: '#' },
          { adp_number: 'INV-2026-0118', adp_issuedon: '2026-01-01', adp_amount:  2916, adp_status: { label: 'Pending' }, adp_pdfurl: '' }
        ]
      }
    };
  }
  if (/adp_engagement\b/i.test(fetchXml)) {
    const role = ctx.environments.__role || 'Accountant';
    const all = [
      { adp_engagementid: 'eng-001', adp_companyid: { id: '00000000-0000-0000-0000-000000000001', name: 'Acme Traders Pvt Ltd' }, adp_processid: 'svc-gst',    adp_processname: 'GST Return (Monthly)',     adp_stage: { label: 'In Progress' }, adp_status: { label: 'On Track' }, adp_ownername: 'Priya Sharma',  adp_startdate: '2026-05-18', adp_duedate: '2026-05-27', adp_progress: 55 },
      { adp_engagementid: 'eng-002', adp_companyid: { id: '00000000-0000-0000-0000-000000000001', name: 'Acme Traders Pvt Ltd' }, adp_processid: 'svc-close',  adp_processname: 'Monthly Book Closure',     adp_stage: { label: 'Review'      }, adp_status: { label: 'At Risk'  }, adp_ownername: 'Rahul Mehta',   adp_startdate: '2026-05-05', adp_duedate: '2026-05-25', adp_progress: 80 },
      { adp_engagementid: 'eng-003', adp_companyid: { id: '00000000-0000-0000-0000-000000000002', name: 'Beta Industries'     }, adp_processid: 'svc-payroll',adp_processname: 'Payroll Run',              adp_stage: { label: 'Intake'      }, adp_status: { label: 'On Track' }, adp_ownername: 'Aisha Khan',    adp_startdate: '2026-05-24', adp_duedate: '2026-05-31', adp_progress: 10 },
      { adp_engagementid: 'eng-004', adp_companyid: { id: '00000000-0000-0000-0000-000000000003', name: 'Gamma Foods LLP'     }, adp_processid: 'svc-bank',   adp_processname: 'Bank Reconciliation',      adp_stage: { label: 'Approved'    }, adp_status: { label: 'Complete' }, adp_ownername: 'Priya Sharma',  adp_startdate: '2026-05-10', adp_duedate: '2026-05-20', adp_progress: 100 },
      { adp_engagementid: 'eng-005', adp_companyid: { id: '00000000-0000-0000-0000-000000000004', name: 'Delta Logistics'     }, adp_processid: 'svc-gst',    adp_processname: 'GST Return (Monthly)',     adp_stage: { label: 'In Progress' }, adp_status: { label: 'Overdue'  }, adp_ownername: 'Rahul Mehta',   adp_startdate: '2026-05-12', adp_duedate: '2026-05-22', adp_progress: 60 },
      { adp_engagementid: 'eng-006', adp_companyid: { id: '00000000-0000-0000-0000-000000000005', name: 'Epsilon Retail'      }, adp_processid: 'svc-audit',  adp_processname: 'Statutory Audit Prep',     adp_stage: { label: 'Intake'      }, adp_status: { label: 'Blocked'  }, adp_ownername: 'Aisha Khan',    adp_startdate: '2026-05-19', adp_duedate: '2026-06-15', adp_progress: 15 },
      { adp_engagementid: 'eng-007', adp_companyid: { id: '00000000-0000-0000-0000-000000000001', name: 'Acme Traders Pvt Ltd' }, adp_processid: 'svc-tds',    adp_processname: 'TDS Return (Quarterly)',   adp_stage: { label: 'Delivered'   }, adp_status: { label: 'Complete' }, adp_ownername: 'Priya Sharma',  adp_startdate: '2026-04-15', adp_duedate: '2026-04-30', adp_progress: 100 },
      { adp_engagementid: 'eng-008', adp_companyid: { id: '00000000-0000-0000-0000-000000000002', name: 'Beta Industries'     }, adp_processid: 'svc-mis',    adp_processname: 'MIS Reporting (Monthly)',  adp_stage: { label: 'Review'      }, adp_status: { label: 'On Track' }, adp_ownername: 'Rahul Mehta',   adp_startdate: '2026-05-15', adp_duedate: '2026-05-28', adp_progress: 70 }
    ];
    const isPortfolio = role === 'Accountant' || role === 'Smartsoft Operator';
    const filteredByCompany = !isPortfolio
      ? all.filter(e => e.adp_companyid.id === '00000000-0000-0000-0000-000000000001')
      : all;
    return { results: { entities: filteredByCompany } };
  }
  if (/adp_onboarding\b/i.test(fetchXml)) {
    const role = ctx.environments.__role || 'Accountant';
    const all = [
      { adp_onboardingid: 'onb-001', adp_companyid: { id: '00000000-0000-0000-0000-000000000007', name: 'Helios Pharma'        }, adp_contactemail: 'cfo@heliospharma.in',  adp_plan: 'all-in-one',       adp_startedon: '2026-05-23', adp_status: { label: 'In Progress' }, adp_overallprogress: 55 },
      { adp_onboardingid: 'onb-002', adp_companyid: { id: '00000000-0000-0000-0000-000000000008', name: 'Indigo Garments'     }, adp_contactemail: 'admin@indigogarments.com', adp_plan: 'tally-hosting', adp_startedon: '2026-05-24', adp_status: { label: 'In Progress' }, adp_overallprogress: 22 },
      { adp_onboardingid: 'onb-003', adp_companyid: { id: '00000000-0000-0000-0000-000000000009', name: 'Juno Auto Spares'    }, adp_contactemail: 'ops@junoauto.co.in', adp_plan: 'm365-integration', adp_startedon: '2026-05-20', adp_status: { label: 'Completed'   }, adp_overallprogress: 100 },
      { adp_onboardingid: 'onb-004', adp_companyid: { id: '00000000-0000-0000-0000-000000000010', name: 'Kshema Foods'        }, adp_contactemail: 'finance@kshema.in', adp_plan: 'all-in-one',     adp_startedon: '2026-05-25', adp_status: { label: 'Failed'      }, adp_overallprogress: 44 }
    ];
    const isPortfolio2 = role === 'Accountant' || role === 'Smartsoft Operator';
    const filtered = !isPortfolio2
      ? [ { ...all[0], adp_companyid: { id: '00000000-0000-0000-0000-000000000001', name: 'Acme Traders Pvt Ltd' }, adp_overallprogress: 88 } ]
      : all;
    return { results: { entities: filtered } };
  }
  if (/adp_staff\b/i.test(fetchXml)) {
    return { results: { entities: [
      { adp_staffid: 'stf-priya',  adp_name: 'Priya Sharma', adp_role: 'Senior Accountant', adp_initials: 'PS', adp_opentasks: 7, adp_capacity: 10, adp_color: '#0a6b3a' },
      { adp_staffid: 'stf-rahul',  adp_name: 'Rahul Mehta',  adp_role: 'Accountant',        adp_initials: 'RM', adp_opentasks: 9, adp_capacity: 10, adp_color: '#b45309' },
      { adp_staffid: 'stf-aisha',  adp_name: 'Aisha Khan',   adp_role: 'Accountant',        adp_initials: 'AK', adp_opentasks: 4, adp_capacity: 10, adp_color: '#1d4ed8' },
      { adp_staffid: 'stf-vikram', adp_name: 'Vikram Joshi', adp_role: 'Junior Accountant', adp_initials: 'VJ', adp_opentasks: 5, adp_capacity: 8,  adp_color: '#6d28d9' },
      { adp_staffid: 'stf-meera',  adp_name: 'Meera Iyer',   adp_role: 'Reviewer',          adp_initials: 'MI', adp_opentasks: 3, adp_capacity: 6,  adp_color: '#be185d' }
    ] } };
  }
  if (/adp_schedule\b/i.test(fetchXml)) {
    return { results: { entities: [
      { adp_scheduleid: 'sch-gst-monthly',    adp_processid: 'svc-gst',     adp_processname: 'GST Return (Monthly)',     adp_companyid: { id: '00000000-0000-0000-0000-000000000001', name: 'Acme Traders Pvt Ltd' }, adp_recurrence: 'Monthly · 20th',   adp_nextrun: '2026-05-28', adp_assigneeid: 'stf-priya',  adp_assigneename: 'Priya Sharma', adp_reminderdays: 3, adp_reminderon: true,  adp_status: { label: 'Active' } },
      { adp_scheduleid: 'sch-payroll-monthly',adp_processid: 'svc-payroll', adp_processname: 'Payroll Run',              adp_companyid: { id: '00000000-0000-0000-0000-000000000002', name: 'Beta Industries'      }, adp_recurrence: 'Monthly · last day', adp_nextrun: '2026-05-31', adp_assigneeid: 'stf-aisha',  adp_assigneename: 'Aisha Khan',   adp_reminderdays: 2, adp_reminderon: true,  adp_status: { label: 'Active' } },
      { adp_scheduleid: 'sch-bank-weekly',    adp_processid: 'svc-bank',    adp_processname: 'Bank Reconciliation',      adp_companyid: { id: '00000000-0000-0000-0000-000000000003', name: 'Gamma Foods LLP'      }, adp_recurrence: 'Weekly · Fri',     adp_nextrun: '2026-05-26', adp_assigneeid: 'stf-rahul',  adp_assigneename: 'Rahul Mehta',  adp_reminderdays: 1, adp_reminderon: true,  adp_status: { label: 'Active' } },
      { adp_scheduleid: 'sch-tds-quarterly',  adp_processid: 'svc-tds',     adp_processname: 'TDS Return (Quarterly)',   adp_companyid: { id: '00000000-0000-0000-0000-000000000001', name: 'Acme Traders Pvt Ltd' }, adp_recurrence: 'Quarterly · 7th',  adp_nextrun: '2026-07-07', adp_assigneeid: 'stf-priya',  adp_assigneename: 'Priya Sharma', adp_reminderdays: 7, adp_reminderon: false, adp_status: { label: 'Active' } },
      { adp_scheduleid: 'sch-mis-monthly',    adp_processid: 'svc-mis',     adp_processname: 'MIS Reporting (Monthly)',  adp_companyid: { id: '00000000-0000-0000-0000-000000000002', name: 'Beta Industries'      }, adp_recurrence: 'Monthly · 5th',    adp_nextrun: '2026-06-05', adp_assigneeid: 'stf-rahul',  adp_assigneename: 'Rahul Mehta',  adp_reminderdays: 2, adp_reminderon: true,  adp_status: { label: 'Active' } },
      { adp_scheduleid: 'sch-close-monthly',  adp_processid: 'svc-close',   adp_processname: 'Monthly Book Closure',     adp_companyid: { id: '00000000-0000-0000-0000-000000000004', name: 'Delta Logistics'      }, adp_recurrence: 'Monthly · 10th',   adp_nextrun: '2026-06-10', adp_assigneeid: 'stf-vikram', adp_assigneename: 'Vikram Joshi', adp_reminderdays: 3, adp_reminderon: true,  adp_status: { label: 'Active' } }
    ] } };
  }
  if (/adp_engagementtask\b/i.test(fetchXml)) {
    return { results: { entities: [
      { adp_taskid: 'tsk-001', adp_engagementid: 'eng-001', adp_name: 'Receive client documents',         adp_assigneeid: 'stf-priya',  adp_assigneename: 'Priya Sharma', adp_due: '2026-05-22', adp_status: { label: 'Done'        }, adp_reminderon: false },
      { adp_taskid: 'tsk-002', adp_engagementid: 'eng-001', adp_name: 'Verify GST input data',            adp_assigneeid: 'stf-priya',  adp_assigneename: 'Priya Sharma', adp_due: '2026-05-23', adp_status: { label: 'Done'        }, adp_reminderon: false },
      { adp_taskid: 'tsk-003', adp_engagementid: 'eng-001', adp_name: 'Reconcile GSTR-2B vs purchases',   adp_assigneeid: 'stf-priya',  adp_assigneename: 'Priya Sharma', adp_due: '2026-05-24', adp_status: { label: 'In Progress' }, adp_reminderon: true  },
      { adp_taskid: 'tsk-004', adp_engagementid: 'eng-001', adp_name: 'Prepare GSTR-3B return',           adp_assigneeid: '',           adp_assigneename: '',             adp_due: '2026-05-25', adp_status: { label: 'Not Started' }, adp_reminderon: true  },
      { adp_taskid: 'tsk-005', adp_engagementid: 'eng-001', adp_name: 'Client sign-off',                  adp_assigneeid: '',           adp_assigneename: 'Client',       adp_due: '2026-05-26', adp_status: { label: 'Not Started' }, adp_reminderon: true  },
      { adp_taskid: 'tsk-006', adp_engagementid: 'eng-001', adp_name: 'File on GSTN portal',              adp_assigneeid: 'stf-priya',  adp_assigneename: 'Priya Sharma', adp_due: '2026-05-27', adp_status: { label: 'Not Started' }, adp_reminderon: true  },
      { adp_taskid: 'tsk-101', adp_engagementid: 'eng-002', adp_name: 'Trial balance review',             adp_assigneeid: 'stf-rahul',  adp_assigneename: 'Rahul Mehta',  adp_due: '2026-05-23', adp_status: { label: 'Done'        }, adp_reminderon: false },
      { adp_taskid: 'tsk-102', adp_engagementid: 'eng-002', adp_name: 'Provisions & accruals',            adp_assigneeid: 'stf-rahul',  adp_assigneename: 'Rahul Mehta',  adp_due: '2026-05-24', adp_status: { label: 'In Progress' }, adp_reminderon: true  },
      { adp_taskid: 'tsk-103', adp_engagementid: 'eng-002', adp_name: 'Reviewer sign-off',                adp_assigneeid: 'stf-meera',  adp_assigneename: 'Meera Iyer',   adp_due: '2026-05-25', adp_status: { label: 'Not Started' }, adp_reminderon: true  },
      { adp_taskid: 'tsk-201', adp_engagementid: 'eng-003', adp_name: 'Collect attendance & LOP',         adp_assigneeid: 'stf-aisha',  adp_assigneename: 'Aisha Khan',   adp_due: '2026-05-26', adp_status: { label: 'In Progress' }, adp_reminderon: true  },
      { adp_taskid: 'tsk-202', adp_engagementid: 'eng-003', adp_name: 'Compute PF / ESI / PT',            adp_assigneeid: '',           adp_assigneename: '',             adp_due: '2026-05-28', adp_status: { label: 'Not Started' }, adp_reminderon: true  },
      { adp_taskid: 'tsk-301', adp_engagementid: 'eng-005', adp_name: 'Pull GSTR-2B JSON',                adp_assigneeid: 'stf-rahul',  adp_assigneename: 'Rahul Mehta',  adp_due: '2026-05-20', adp_status: { label: 'Done'        }, adp_reminderon: false },
      { adp_taskid: 'tsk-302', adp_engagementid: 'eng-005', adp_name: 'Resolve mismatch (5 lines)',       adp_assigneeid: '',           adp_assigneename: '',             adp_due: '2026-05-22', adp_status: { label: 'In Progress' }, adp_reminderon: true  },
      { adp_taskid: 'tsk-303', adp_engagementid: 'eng-005', adp_name: 'File 3B',                          adp_assigneeid: 'stf-rahul',  adp_assigneename: 'Rahul Mehta',  adp_due: '2026-05-22', adp_status: { label: 'Not Started' }, adp_reminderon: true  },
      { adp_taskid: 'tsk-401', adp_engagementid: 'eng-006', adp_name: 'Send confirmation letters',        adp_assigneeid: 'stf-aisha',  adp_assigneename: 'Aisha Khan',   adp_due: '2026-05-29', adp_status: { label: 'Not Started' }, adp_reminderon: true  },
      { adp_taskid: 'tsk-501', adp_engagementid: 'eng-008', adp_name: 'P&L snapshot',                     adp_assigneeid: 'stf-rahul',  adp_assigneename: 'Rahul Mehta',  adp_due: '2026-05-26', adp_status: { label: 'Done'        }, adp_reminderon: false },
      { adp_taskid: 'tsk-502', adp_engagementid: 'eng-008', adp_name: 'Cashflow snapshot',                adp_assigneeid: 'stf-rahul',  adp_assigneename: 'Rahul Mehta',  adp_due: '2026-05-27', adp_status: { label: 'In Progress' }, adp_reminderon: true  },
      { adp_taskid: 'tsk-503', adp_engagementid: 'eng-008', adp_name: 'KPI deck for client',              adp_assigneeid: 'stf-meera',  adp_assigneename: 'Meera Iyer',   adp_due: '2026-05-28', adp_status: { label: 'Not Started' }, adp_reminderon: true  }
    ] } };
  }
  if (/adp_activity\b/i.test(fetchXml)) {
    return { results: { entities: [
      { adp_activityid: 'act-001', adp_engagementid: 'eng-001', adp_type: { label: 'comment' }, adp_actor: 'Priya Sharma',  adp_ts: '2026-05-24 10:12', adp_text: 'GSTR-2B downloaded. @Rahul Mehta please review the 5 mismatches before EOD.' },
      { adp_activityid: 'act-002', adp_engagementid: 'eng-001', adp_type: { label: 'status'  }, adp_actor: 'system',        adp_ts: '2026-05-24 09:55', adp_text: 'Stage moved Intake → In Progress.' },
      { adp_activityid: 'act-003', adp_engagementid: 'eng-001', adp_type: { label: 'comment' }, adp_actor: 'Rahul Mehta',   adp_ts: '2026-05-24 11:30', adp_text: 'On it. Will share by 4pm.' },
      { adp_activityid: 'act-004', adp_engagementid: 'eng-002', adp_type: { label: 'comment' }, adp_actor: 'Meera Iyer',    adp_ts: '2026-05-25 09:05', adp_text: 'Need provisions schedule before I can sign off. @Rahul Mehta' },
      { adp_activityid: 'act-005', adp_engagementid: 'eng-002', adp_type: { label: 'status'  }, adp_actor: 'system',        adp_ts: '2026-05-24 18:40', adp_text: 'Status changed: On Track → At Risk (2 days to due).' },
      { adp_activityid: 'act-006', adp_engagementid: 'eng-005', adp_type: { label: 'status'  }, adp_actor: 'system',        adp_ts: '2026-05-23 00:01', adp_text: 'Engagement is overdue. Reminder sent to Rahul Mehta.' },
      { adp_activityid: 'act-007', adp_engagementid: 'eng-005', adp_type: { label: 'comment' }, adp_actor: 'Rahul Mehta',   adp_ts: '2026-05-23 11:20', adp_text: 'Client has not shared purchase register yet. Escalating.' },
      { adp_activityid: 'act-008', adp_engagementid: 'eng-003', adp_type: { label: 'comment' }, adp_actor: 'Aisha Khan',    adp_ts: '2026-05-25 14:10', adp_text: 'Attendance file received. Starting payroll compute.' }
    ] } };
  }
  if (/adp_serviceprocess/i.test(fetchXml)) {
    return { results: { entities: [
      { adp_serviceprocessid: 'svc-gst',     adp_name: 'GST Return (Monthly)',   adp_description: 'GSTR-1, 2B reconciliation, and GSTR-3B preparation & filing.', adp_sladays: 5,  adp_ownerrole: 'Accountant', adp_taskcount: 6, adp_active: true },
      { adp_serviceprocessid: 'svc-tds',     adp_name: 'TDS Return (Quarterly)', adp_description: 'Compute, deposit and file quarterly TDS returns (24Q/26Q).',    adp_sladays: 7,  adp_ownerrole: 'Accountant', adp_taskcount: 5, adp_active: true },
      { adp_serviceprocessid: 'svc-close',   adp_name: 'Monthly Book Closure',   adp_description: 'Trial balance review, period close, provisions and JE postings.', adp_sladays: 10, adp_ownerrole: 'Accountant', adp_taskcount: 8, adp_active: true },
      { adp_serviceprocessid: 'svc-payroll', adp_name: 'Payroll Run',            adp_description: 'Payslip generation, PF/ESI/PT compute and disbursal advice.',   adp_sladays: 3,  adp_ownerrole: 'Accountant', adp_taskcount: 5, adp_active: true },
      { adp_serviceprocessid: 'svc-bank',    adp_name: 'Bank Reconciliation',    adp_description: 'Match bank statements with ledger and identify unreconciled entries.', adp_sladays: 4,  adp_ownerrole: 'Accountant', adp_taskcount: 4, adp_active: true },
      { adp_serviceprocessid: 'svc-audit',   adp_name: 'Statutory Audit Prep',   adp_description: 'Year-end schedules, confirmations and audit-ready trial balance.', adp_sladays: 20, adp_ownerrole: 'Accountant', adp_taskcount: 9, adp_active: true },
      { adp_serviceprocessid: 'svc-mis',     adp_name: 'MIS Reporting (Monthly)',adp_description: 'P&L, cashflow snapshot, KPI dashboard delivered to client.',     adp_sladays: 6,  adp_ownerrole: 'Accountant', adp_taskcount: 5, adp_active: true }
    ] } };
  }
  if (/adp_dataingestion/i.test(fetchXml)) {
    return {
      results: {
        entities: [
          { adp_ingestionid: 'ing-001', adp_companyid: { id: '00000000-0000-0000-0000-000000000001', name: 'Acme Traders Pvt Ltd' }, adp_name: 'Invoice_April.pdf',        adp_kind: 'Invoice',        adp_channel: { label: 'Email' },    adp_sender: 'vendor@acme.com',           adp_status: { label: 'Pending Review' }, adp_receivedon: '2026-05-26 10:24', adp_size: '184 KB', adp_assigneeid: 'stf-priya',  adp_assigneename: 'Priya Sharma',  adp_messageurl: '' },
          { adp_ingestionid: 'ing-002', adp_companyid: { id: '00000000-0000-0000-0000-000000000001', name: 'Acme Traders Pvt Ltd' }, adp_name: 'Bank_HDFC_Apr.csv',        adp_kind: 'Bank Statement', adp_channel: { label: 'Email' },    adp_sender: 'noreply@hdfc.com',          adp_status: { label: 'Imported'       }, adp_receivedon: '2026-05-25 09:12', adp_size: '42 KB',  adp_assigneeid: 'stf-priya',  adp_assigneename: 'Priya Sharma',  adp_messageurl: '' },
          { adp_ingestionid: 'ing-003', adp_companyid: { id: '00000000-0000-0000-0000-000000000001', name: 'Acme Traders Pvt Ltd' }, adp_name: 'GSTR-2B_Apr.json',         adp_kind: 'GST Return',     adp_channel: { label: 'WhatsApp' }, adp_sender: '+91 98xxx 12345',           adp_status: { label: 'Queued'         }, adp_receivedon: '2026-05-25 17:48', adp_size: '12 KB',  adp_assigneeid: 'stf-priya',  adp_assigneename: 'Priya Sharma',  adp_messageurl: '' },
          { adp_ingestionid: 'ing-004', adp_companyid: { id: '00000000-0000-0000-0000-000000000001', name: 'Acme Traders Pvt Ltd' }, adp_name: 'DayBook_2026-05-24.pdf',   adp_kind: 'Voucher',        adp_channel: { label: 'Telegram' }, adp_sender: '@smart_tally',              adp_status: { label: 'Imported'       }, adp_receivedon: '2026-05-24 18:30', adp_size: '512 KB', adp_assigneeid: '',           adp_assigneename: '',              adp_messageurl: 'https://t.me/smart_tally/12' },
          { adp_ingestionid: 'ing-005', adp_companyid: { id: '00000000-0000-0000-0000-000000000001', name: 'Acme Traders Pvt Ltd' }, adp_name: 'Voucher_3321.jpg',         adp_kind: 'Voucher',        adp_channel: { label: 'Telegram' }, adp_sender: '@smart_tally',              adp_status: { label: 'Error'          }, adp_receivedon: '2026-05-23 11:02', adp_size: '1.1 MB', adp_assigneeid: 'stf-rahul',  adp_assigneename: 'Rahul Mehta',   adp_messageurl: 'https://t.me/smart_tally/9' },

          { adp_ingestionid: 'ing-006', adp_companyid: { id: '00000000-0000-0000-0000-000000000002', name: 'Beta Industries'     }, adp_name: 'Purchase_Invoice_44.pdf',  adp_kind: 'Invoice',        adp_channel: { label: 'Email' },    adp_sender: 'accounts@beta.in',          adp_status: { label: 'Pending Review' }, adp_receivedon: '2026-05-26 08:55', adp_size: '220 KB', adp_assigneeid: 'stf-rahul',  adp_assigneename: 'Rahul Mehta',   adp_messageurl: '' },
          { adp_ingestionid: 'ing-007', adp_companyid: { id: '00000000-0000-0000-0000-000000000002', name: 'Beta Industries'     }, adp_name: 'Bank_ICICI_Apr.pdf',       adp_kind: 'Bank Statement', adp_channel: { label: 'SharePoint' },adp_sender: 'cfo@beta.in',              adp_status: { label: 'Imported'       }, adp_receivedon: '2026-05-25 16:20', adp_size: '88 KB',  adp_assigneeid: 'stf-rahul',  adp_assigneename: 'Rahul Mehta',   adp_messageurl: '' },
          { adp_ingestionid: 'ing-008', adp_companyid: { id: '00000000-0000-0000-0000-000000000002', name: 'Beta Industries'     }, adp_name: 'Payroll_Inputs.xlsx',      adp_kind: 'Other',          adp_channel: { label: 'WhatsApp' }, adp_sender: '+91 99xxx 22134',           adp_status: { label: 'Queued'         }, adp_receivedon: '2026-05-25 12:11', adp_size: '54 KB',  adp_assigneeid: '',           adp_assigneename: '',              adp_messageurl: '' },
          { adp_ingestionid: 'ing-009', adp_companyid: { id: '00000000-0000-0000-0000-000000000002', name: 'Beta Industries'     }, adp_name: 'MIS_Notes.pdf',            adp_kind: 'Other',          adp_channel: { label: 'Email' },    adp_sender: 'cfo@beta.in',               adp_status: { label: 'Pending Review' }, adp_receivedon: '2026-05-24 09:30', adp_size: '76 KB',  adp_assigneeid: 'stf-meera',  adp_assigneename: 'Meera Iyer',    adp_messageurl: '' },

          { adp_ingestionid: 'ing-010', adp_companyid: { id: '00000000-0000-0000-0000-000000000003', name: 'Gamma Foods LLP'     }, adp_name: 'Bank_Axis_Apr.csv',        adp_kind: 'Bank Statement', adp_channel: { label: 'Email' },    adp_sender: 'estatements@axisbank.com',  adp_status: { label: 'Imported'       }, adp_receivedon: '2026-05-26 06:02', adp_size: '38 KB',  adp_assigneeid: 'stf-rahul',  adp_assigneename: 'Rahul Mehta',   adp_messageurl: '' },
          { adp_ingestionid: 'ing-011', adp_companyid: { id: '00000000-0000-0000-0000-000000000003', name: 'Gamma Foods LLP'     }, adp_name: 'Vendor_Invoice_771.pdf',   adp_kind: 'Invoice',        adp_channel: { label: 'WhatsApp' }, adp_sender: '+91 95xxx 88420',           adp_status: { label: 'Pending Review' }, adp_receivedon: '2026-05-25 14:48', adp_size: '198 KB', adp_assigneeid: '',           adp_assigneename: '',              adp_messageurl: '' },
          { adp_ingestionid: 'ing-012', adp_companyid: { id: '00000000-0000-0000-0000-000000000003', name: 'Gamma Foods LLP'     }, adp_name: 'Tally_Backup_May.7z',      adp_kind: 'Other',          adp_channel: { label: 'SharePoint' },adp_sender: 'ops@gammafoods.in',         adp_status: { label: 'Imported'       }, adp_receivedon: '2026-05-24 18:00', adp_size: '14 MB',  adp_assigneeid: 'stf-rahul',  adp_assigneename: 'Rahul Mehta',   adp_messageurl: '' },

          { adp_ingestionid: 'ing-013', adp_companyid: { id: '00000000-0000-0000-0000-000000000004', name: 'Delta Logistics'     }, adp_name: 'GSTR-3B_Mar.json',         adp_kind: 'GST Return',     adp_channel: { label: 'Email' },    adp_sender: 'gst@deltalog.in',           adp_status: { label: 'Error'          }, adp_receivedon: '2026-05-23 22:15', adp_size: '24 KB',  adp_assigneeid: 'stf-vikram', adp_assigneename: 'Vikram Joshi',  adp_messageurl: '' },
          { adp_ingestionid: 'ing-014', adp_companyid: { id: '00000000-0000-0000-0000-000000000004', name: 'Delta Logistics'     }, adp_name: 'LR_Vouchers_W21.zip',      adp_kind: 'Voucher',        adp_channel: { label: 'Telegram' }, adp_sender: '@delta_ops',                adp_status: { label: 'Queued'         }, adp_receivedon: '2026-05-25 11:42', adp_size: '3.2 MB', adp_assigneeid: 'stf-vikram', adp_assigneename: 'Vikram Joshi',  adp_messageurl: '' },
          { adp_ingestionid: 'ing-015', adp_companyid: { id: '00000000-0000-0000-0000-000000000004', name: 'Delta Logistics'     }, adp_name: 'Diesel_Bills_Apr.pdf',     adp_kind: 'Invoice',        adp_channel: { label: 'WhatsApp' }, adp_sender: '+91 90xxx 71212',           adp_status: { label: 'Pending Review' }, adp_receivedon: '2026-05-24 13:09', adp_size: '460 KB', adp_assigneeid: '',           adp_assigneename: '',              adp_messageurl: '' },

          { adp_ingestionid: 'ing-016', adp_companyid: { id: '00000000-0000-0000-0000-000000000005', name: 'Epsilon Retail'      }, adp_name: 'POS_Sales_May.csv',        adp_kind: 'Other',          adp_channel: { label: 'SharePoint' },adp_sender: 'pos@epsilon.in',            adp_status: { label: 'Imported'       }, adp_receivedon: '2026-05-26 02:00', adp_size: '1.8 MB', adp_assigneeid: 'stf-aisha',  adp_assigneename: 'Aisha Khan',    adp_messageurl: '' },
          { adp_ingestionid: 'ing-017', adp_companyid: { id: '00000000-0000-0000-0000-000000000005', name: 'Epsilon Retail'      }, adp_name: 'Vendor_Stmt_April.pdf',    adp_kind: 'Bank Statement', adp_channel: { label: 'Email' },    adp_sender: 'finance@epsilon.in',        adp_status: { label: 'Pending Review' }, adp_receivedon: '2026-05-25 19:25', adp_size: '102 KB', adp_assigneeid: 'stf-aisha',  adp_assigneename: 'Aisha Khan',    adp_messageurl: '' },
          { adp_ingestionid: 'ing-018', adp_companyid: { id: '00000000-0000-0000-0000-000000000005', name: 'Epsilon Retail'      }, adp_name: 'Cash_Memo_42.jpg',         adp_kind: 'Voucher',        adp_channel: { label: 'WhatsApp' }, adp_sender: '+91 91xxx 30303',           adp_status: { label: 'Queued'         }, adp_receivedon: '2026-05-24 16:55', adp_size: '780 KB', adp_assigneeid: '',           adp_assigneename: '',              adp_messageurl: '' }
        ]
      }
    };
  }
  if (/adp_companychannel\b/i.test(fetchXml)) {
    return { results: { entities: [
      { adp_companychannelid: 'cc-001', adp_companyid: { id: '00000000-0000-0000-0000-000000000001', name: 'Acme Traders Pvt Ltd' }, adp_emailalias: 'acme@inbox.smartsoft.in',     adp_wanumber: '+91 80000 11001', adp_tghandle: '@smart_tally',  adp_spfolder: 'Acme Traders Pvt Ltd',  adp_clientcontacts: 'cfo@acme.com,ap@acme.com' },
      { adp_companychannelid: 'cc-002', adp_companyid: { id: '00000000-0000-0000-0000-000000000002', name: 'Beta Industries'     }, adp_emailalias: 'beta@inbox.smartsoft.in',     adp_wanumber: '+91 80000 11002', adp_tghandle: '@beta_books',   adp_spfolder: 'Beta Industries',       adp_clientcontacts: 'cfo@beta.in' },
      { adp_companychannelid: 'cc-003', adp_companyid: { id: '00000000-0000-0000-0000-000000000003', name: 'Gamma Foods LLP'     }, adp_emailalias: 'gamma@inbox.smartsoft.in',    adp_wanumber: '+91 80000 11003', adp_tghandle: '@gamma_inbox',  adp_spfolder: 'Gamma Foods LLP',       adp_clientcontacts: 'ops@gammafoods.in' },
      { adp_companychannelid: 'cc-004', adp_companyid: { id: '00000000-0000-0000-0000-000000000004', name: 'Delta Logistics'     }, adp_emailalias: 'delta@inbox.smartsoft.in',    adp_wanumber: '+91 80000 11004', adp_tghandle: '@delta_ops',    adp_spfolder: 'Delta Logistics',       adp_clientcontacts: 'gst@deltalog.in' },
      { adp_companychannelid: 'cc-005', adp_companyid: { id: '00000000-0000-0000-0000-000000000005', name: 'Epsilon Retail'      }, adp_emailalias: 'epsilon@inbox.smartsoft.in',  adp_wanumber: '+91 80000 11005', adp_tghandle: '@epsilon_pos',  adp_spfolder: 'Epsilon Retail',        adp_clientcontacts: 'finance@epsilon.in' }
    ]}};
  }
  if (/adp_companyassignment\b/i.test(fetchXml)) {
    return { results: { entities: [
      { adp_companyassignmentid: 'ca-001', adp_companyid: { id: '00000000-0000-0000-0000-000000000001', name: 'Acme Traders Pvt Ltd' }, adp_staffid: 'stf-priya' },
      { adp_companyassignmentid: 'ca-002', adp_companyid: { id: '00000000-0000-0000-0000-000000000002', name: 'Beta Industries'     }, adp_staffid: 'stf-rahul' },
      { adp_companyassignmentid: 'ca-003', adp_companyid: { id: '00000000-0000-0000-0000-000000000002', name: 'Beta Industries'     }, adp_staffid: 'stf-meera' },
      { adp_companyassignmentid: 'ca-004', adp_companyid: { id: '00000000-0000-0000-0000-000000000003', name: 'Gamma Foods LLP'     }, adp_staffid: 'stf-rahul' },
      { adp_companyassignmentid: 'ca-005', adp_companyid: { id: '00000000-0000-0000-0000-000000000004', name: 'Delta Logistics'     }, adp_staffid: 'stf-vikram' },
      { adp_companyassignmentid: 'ca-006', adp_companyid: { id: '00000000-0000-0000-0000-000000000005', name: 'Epsilon Retail'      }, adp_staffid: 'stf-aisha' },
      { adp_companyassignmentid: 'ca-007', adp_companyid: { id: '00000000-0000-0000-0000-000000000001', name: 'Acme Traders Pvt Ltd' }, adp_staffid: 'stf-rahul' },
      { adp_companyassignmentid: 'ca-008', adp_companyid: { id: '00000000-0000-0000-0000-000000000003', name: 'Gamma Foods LLP'     }, adp_staffid: 'stf-priya' }
    ]}};
  }

  // ---------- Audit module stubs ----------
  // Helper: map a companyId to its engagement IDs (mirrors the engagement stub).
  // Used by child stubs when the page scopes via <link-entity name="adp_auditengagement">
  // ... <condition attribute="adp_companyid" .../></link-entity>.
  const engagementsForCompany = (companyId) => ({
    '00000000-0000-0000-0000-000000000001': ['aud-001'],
    '00000000-0000-0000-0000-000000000002': ['aud-002'],
    '00000000-0000-0000-0000-000000000003': ['aud-003'],
    '00000000-0000-0000-0000-000000000004': ['aud-004']
  }[companyId] || []);

  if (/<entity\s+name="adp_auditengagement"/i.test(fetchXml)) {
    const all = [
      { adp_auditengagementid: 'aud-001', adp_companyid: { id: '00000000-0000-0000-0000-000000000001', name: 'Acme Traders Pvt Ltd' }, adp_programcode: 'STAT-FY',  adp_programname: 'Statutory audit FY 2024-25', adp_framework: { label: 'Statutory' }, adp_periodfrom: '2024-04-01', adp_periodto: '2025-03-31', adp_materiality: 1500000, adp_performancemateriality: 75, adp_status: { label: 'Fieldwork' }, adp_leadpartner: 'CA Rohan Mehta',  adp_leadmanager: 'CA Priya Sharma', adp_progress: 62, adp_duedate: '2025-09-30', adp_riskareas: 'Revenue cut-off,Inventory valuation,Related-party transactions' },
      { adp_auditengagementid: 'aud-002', adp_companyid: { id: '00000000-0000-0000-0000-000000000002', name: 'Beta Industries'      }, adp_programcode: 'GST-9C',   adp_programname: 'GST 9C reconciliation FY 2023-24', adp_framework: { label: 'GST' }, adp_periodfrom: '2023-04-01', adp_periodto: '2024-03-31', adp_materiality: 500000,  adp_performancemateriality: 60, adp_status: { label: 'Planning' }, adp_leadpartner: 'CA Rohan Mehta', adp_leadmanager: 'CA Aisha Khan',   adp_progress: 15, adp_duedate: '2024-12-31', adp_riskareas: 'ITC mismatch,3B vs 1 variance' },
      { adp_auditengagementid: 'aud-003', adp_companyid: { id: '00000000-0000-0000-0000-000000000003', name: 'Gamma Foods LLP'      }, adp_programcode: 'ICR',      adp_programname: 'Internal controls review',         adp_framework: { label: 'Internal' }, adp_periodfrom: '2025-01-01', adp_periodto: '2025-06-30', adp_materiality: 800000,  adp_performancemateriality: 70, adp_status: { label: 'Review' },   adp_leadpartner: 'CA Vikram Rao',  adp_leadmanager: 'CA Meera Iyer',  adp_progress: 88, adp_duedate: '2025-07-31', adp_riskareas: 'Segregation of duties,Approvals,Master data' },
      { adp_auditengagementid: 'aud-004', adp_companyid: { id: '00000000-0000-0000-0000-000000000004', name: 'Delta Logistics'      }, adp_programcode: 'TAX-44AB', adp_programname: 'Tax audit u/s 44AB FY 2024-25',    adp_framework: { label: 'Statutory' }, adp_periodfrom: '2024-04-01', adp_periodto: '2025-03-31', adp_materiality: 600000,  adp_performancemateriality: 65, adp_status: { label: 'Finalize' },  adp_leadpartner: 'CA Rohan Mehta', adp_leadmanager: 'CA Priya Sharma', adp_progress: 96, adp_duedate: '2025-10-31', adp_riskareas: 'TDS short deduction,Cash expenses' }
    ];
    const m = fetchXml.match(/adp_auditengagementid"\s+operator="eq"\s+value="([^"]+)"/i);
    if (m) return { results: { entities: all.filter(e => e.adp_auditengagementid === m[1]) } };
    const cm = fetchXml.match(/adp_companyid"\s+operator="eq"\s+value="([^"]+)"/i);
    if (cm) return { results: { entities: all.filter(e => e.adp_companyid && e.adp_companyid.id === cm[1]) } };
    return { results: { entities: all } };
  }

  if (/<entity\s+name="adp_workpaper"/i.test(fetchXml)) {
    const all = [
      { adp_workpaperid: 'wp-001', adp_auditengagementid: 'aud-001', adp_proceduresection: 'Revenue',       adp_procedurecode: 'REV-001', adp_procedurename: 'Sales cut-off — last 5 invoices',     adp_proceduredescription: 'Inspect last 5 sales invoices of FY and first 5 of next FY. Trace dispatch and GST 1 reporting period.', adp_assertion: { label: 'Cut-off' }, adp_risklevel: { label: 'High' },   adp_status: { label: 'Ready for Review' }, adp_preparer: 'Priya Sharma', adp_preparedon: '2025-06-12', adp_evidencecount: 5, adp_exceptionscount: 1, adp_samplesize: 10, adp_samplingmethod: { label: 'Judgmental' }, adp_populationsize: 1245, adp_conclusion: 'No cut-off errors noted. One late dispatch documented separately.' },
      { adp_workpaperid: 'wp-002', adp_auditengagementid: 'aud-001', adp_proceduresection: 'Cash & Bank',   adp_procedurecode: 'CB-002',  adp_procedurename: 'Bank reconciliation review',           adp_proceduredescription: 'Agree BRS with bank confirmation; investigate unreconciled items > 30 days.', adp_assertion: { label: 'Existence' }, adp_risklevel: { label: 'Medium' }, adp_status: { label: 'In Progress' },     adp_preparer: 'Rahul Mehta',  adp_preparedon: '2025-06-10', adp_evidencecount: 3, adp_exceptionscount: 2, adp_samplesize: 12, adp_samplingmethod: { label: 'Systematic' }, adp_populationsize: 12, adp_conclusion: '' },
      { adp_workpaperid: 'wp-003', adp_auditengagementid: 'aud-001', adp_proceduresection: 'Journal Entries', adp_procedurecode: 'JE-001', adp_procedurename: 'Manual JE analytics — weekend & round',  adp_proceduredescription: 'Run JE analytics over the year; investigate weekend and round-amount postings.', adp_assertion: { label: 'Occurrence' }, adp_risklevel: { label: 'High' },  adp_status: { label: 'Reviewed' },        adp_preparer: 'Priya Sharma', adp_preparedon: '2025-06-05', adp_evidencecount: 2, adp_exceptionscount: 4, adp_samplesize: 35, adp_samplingmethod: { label: 'MUS' },        adp_populationsize: 6814, adp_conclusion: 'Four exceptions flagged; all explained by management.' },
      { adp_workpaperid: 'wp-004', adp_auditengagementid: 'aud-001', adp_proceduresection: 'Inventory',     adp_procedurecode: 'INV-001', adp_procedurename: 'Physical verification attendance',     adp_proceduredescription: 'Attend stock count, perform test counts and roll-forward.', adp_assertion: { label: 'Existence' }, adp_risklevel: { label: 'High' },  adp_status: { label: 'Open' },           adp_preparer: 'Aisha Khan',   adp_preparedon: '',           adp_evidencecount: 0, adp_exceptionscount: 0, adp_samplesize: 40, adp_samplingmethod: { label: 'Random' },     adp_populationsize: 612, adp_conclusion: '' },
      { adp_workpaperid: 'wp-005', adp_auditengagementid: 'aud-002', adp_proceduresection: 'Reconciliation', adp_procedurecode: 'GST-001', adp_procedurename: 'Books vs GSTR-3B outward tax',         adp_proceduredescription: 'Reconcile books outward tax with 3B liability box.', adp_assertion: { label: 'Completeness' }, adp_risklevel: { label: 'High' }, adp_status: { label: 'In Progress' },     adp_preparer: 'Meera Iyer',   adp_preparedon: '2025-06-08', adp_evidencecount: 4, adp_exceptionscount: 3, adp_samplesize: 12, adp_samplingmethod: { label: 'Systematic' }, adp_populationsize: 12,  adp_conclusion: '' }
    ];
    const m = fetchXml.match(/adp_workpaperid"\s+operator="eq"\s+value="([^"]+)"/i);
    if (m) return { results: { entities: all.filter(w => w.adp_workpaperid === m[1]) } };
    const e = fetchXml.match(/adp_auditengagementid"\s+operator="eq"\s+value="([^"]+)"/i);
    if (e) return { results: { entities: all.filter(w => w.adp_auditengagementid === e[1]) } };
    const cm = fetchXml.match(/adp_companyid"\s+operator="eq"\s+value="([^"]+)"/i);
    if (cm) { const ids = engagementsForCompany(cm[1]); return { results: { entities: all.filter(w => ids.includes(w.adp_auditengagementid)) } }; }
    return { results: { entities: all } };
  }

  if (/<entity\s+name="adp_exception"/i.test(fetchXml)) {
    const all = [
      { adp_exceptionid: 'ex-001', adp_auditengagementid: 'aud-001', adp_companyid: { id: '00000000-0000-0000-0000-000000000001', name: 'Acme Traders Pvt Ltd' }, adp_rulecode: 'JE.WEEKEND',         adp_rulename: 'Manual JE posted on weekend',   adp_source: { label: 'Tally' },  adp_severity: { label: 'High'   }, adp_amount:  450000, adp_status: { label: 'Investigating' }, adp_description: 'Voucher #JV-1024 posted on Sun 23-Mar-25',          adp_detectedon: '2025-06-11', adp_linkedworkpaperid: 'wp-003' },
      { adp_exceptionid: 'ex-002', adp_auditengagementid: 'aud-001', adp_companyid: { id: '00000000-0000-0000-0000-000000000001', name: 'Acme Traders Pvt Ltd' }, adp_rulecode: 'JE.ROUND_AMOUNT',    adp_rulename: 'Round-amount JE >= ₹1 lakh',    adp_source: { label: 'Tally' },  adp_severity: { label: 'Medium' }, adp_amount: 1000000, adp_status: { label: 'New' },           adp_description: 'Voucher #JV-0998 — ₹10,00,000 round',                adp_detectedon: '2025-06-11', adp_linkedworkpaperid: '' },
      { adp_exceptionid: 'ex-003', adp_auditengagementid: 'aud-001', adp_companyid: { id: '00000000-0000-0000-0000-000000000001', name: 'Acme Traders Pvt Ltd' }, adp_rulecode: 'BANK.UNRECONCILED.30D', adp_rulename: 'Unreconciled bank > 30d',     adp_source: { label: 'Bank' },   adp_severity: { label: 'High'   }, adp_amount:  238000, adp_status: { label: 'Investigating' }, adp_description: 'HDFC current — 4 entries unreconciled since 28-Feb', adp_detectedon: '2025-06-09', adp_linkedworkpaperid: 'wp-002' },
      { adp_exceptionid: 'ex-004', adp_auditengagementid: 'aud-001', adp_companyid: { id: '00000000-0000-0000-0000-000000000001', name: 'Acme Traders Pvt Ltd' }, adp_rulecode: 'S40A3.CASH_PAYMENT',    adp_rulename: 'Cash payment > ₹10k (s40A(3))',adp_source: { label: 'Tally' }, adp_severity: { label: 'Medium' }, adp_amount:   25000, adp_status: { label: 'Resolved' },     adp_description: 'Cash payment ₹25,000 to vendor — disallowed in tax',  adp_detectedon: '2025-06-07', adp_linkedworkpaperid: 'wp-003' },
      { adp_exceptionid: 'ex-005', adp_auditengagementid: 'aud-002', adp_companyid: { id: '00000000-0000-0000-0000-000000000002', name: 'Beta Industries'      }, adp_rulecode: 'GST.BOOKS_VS_3B',    adp_rulename: 'Books vs 3B outward tax mismatch', adp_source: { label: 'GST' }, adp_severity: { label: 'High'   }, adp_amount:   87500, adp_status: { label: 'New' },          adp_description: 'Sep-24 variance ₹87,500 — books > 3B',                adp_detectedon: '2025-06-12', adp_linkedworkpaperid: 'wp-005' },
      { adp_exceptionid: 'ex-006', adp_auditengagementid: 'aud-002', adp_companyid: { id: '00000000-0000-0000-0000-000000000002', name: 'Beta Industries'      }, adp_rulecode: 'GST.ITC_VS_2B',      adp_rulename: 'ITC books vs GSTR-2B mismatch', adp_source: { label: 'GST' },    adp_severity: { label: 'High'   }, adp_amount:  142000, adp_status: { label: 'Investigating' }, adp_description: 'Excess ITC claimed vs 2B for Q3',                    adp_detectedon: '2025-06-11', adp_linkedworkpaperid: '' },
      { adp_exceptionid: 'ex-007', adp_auditengagementid: 'aud-003', adp_companyid: { id: '00000000-0000-0000-0000-000000000003', name: 'Gamma Foods LLP'      }, adp_rulecode: 'PAYROLL.NEGATIVE_NET', adp_rulename: 'Negative net pay',             adp_source: { label: 'Payroll' }, adp_severity: { label: 'Low'    }, adp_amount:   -1200, adp_status: { label: 'Accepted' },     adp_description: 'Negative net pay for EMP-117 due to advance recovery',adp_detectedon: '2025-06-04', adp_linkedworkpaperid: '' }
    ];
    const e = fetchXml.match(/adp_auditengagementid"\s+operator="eq"\s+value="([^"]+)"/i);
    if (e) return { results: { entities: all.filter(x => x.adp_auditengagementid === e[1]) } };
    const cm = fetchXml.match(/adp_companyid"\s+operator="eq"\s+value="([^"]+)"/i);
    if (cm) { const ids = engagementsForCompany(cm[1]); return { results: { entities: all.filter(x => ids.includes(x.adp_auditengagementid)) } }; }
    return { results: { entities: all } };
  }

  if (/<entity\s+name="adp_evidence"/i.test(fetchXml)) {
    const all = [
      { adp_evidenceid: 'ev-001', adp_workpaperid: 'wp-001', adp_filename: 'Invoice-INV-2245.pdf', adp_fileurl: '#', adp_sourcechannel: { label: 'Email' },    adp_uploadedby: 'client@acme.in',  adp_uploadedon: '2025-06-11', adp_hashsha256: 'a91b2c4d8e' },
      { adp_evidenceid: 'ev-002', adp_workpaperid: 'wp-001', adp_filename: 'Invoice-INV-2246.pdf', adp_fileurl: '#', adp_sourcechannel: { label: 'SharePoint' }, adp_uploadedby: 'Priya Sharma',    adp_uploadedon: '2025-06-11', adp_hashsha256: 'b22a55ec33' },
      { adp_evidenceid: 'ev-003', adp_workpaperid: 'wp-002', adp_filename: 'HDFC-BRS-Mar25.xlsx',  adp_fileurl: '#', adp_sourcechannel: { label: 'Tally' },    adp_uploadedby: 'Rahul Mehta',     adp_uploadedon: '2025-06-10', adp_hashsha256: 'cc8841aafb' },
      { adp_evidenceid: 'ev-004', adp_workpaperid: 'wp-003', adp_filename: 'JE-analytics.csv',     adp_fileurl: '#', adp_sourcechannel: { label: 'Tally' },    adp_uploadedby: 'Priya Sharma',    adp_uploadedon: '2025-06-05', adp_hashsha256: 'd1e2f3a4b5' }
    ];
    const w = fetchXml.match(/adp_workpaperid"\s+operator="eq"\s+value="([^"]+)"/i);
    if (w) return { results: { entities: all.filter(e => e.adp_workpaperid === w[1]) } };
    return { results: { entities: all } };
  }

  if (/<entity\s+name="adp_sample"/i.test(fetchXml)) {
    const all = [
      { adp_sampleid: 'sm-001', adp_workpaperid: 'wp-001', adp_itemref: 'INV-2245', adp_itemdescription: 'Sale to BlueLink Pvt Ltd', adp_amount: 240000, adp_testresult: { label: 'Pass' }, adp_notes: '' },
      { adp_sampleid: 'sm-002', adp_workpaperid: 'wp-001', adp_itemref: 'INV-2246', adp_itemdescription: 'Sale to Orion Retail',     adp_amount: 185000, adp_testresult: { label: 'Pass' }, adp_notes: '' },
      { adp_sampleid: 'sm-003', adp_workpaperid: 'wp-001', adp_itemref: 'INV-2247', adp_itemdescription: 'Sale to CrestEdge',        adp_amount: 305000, adp_testresult: { label: 'Fail' }, adp_notes: 'Dispatched 2-Apr but invoiced 30-Mar' }
    ];
    const w = fetchXml.match(/adp_workpaperid"\s+operator="eq"\s+value="([^"]+)"/i);
    if (w) return { results: { entities: all.filter(s => s.adp_workpaperid === w[1]) } };
    return { results: { entities: all } };
  }

  if (/<entity\s+name="adp_review"/i.test(fetchXml)) {
    const all = [
      { adp_reviewid: 'rv-001', adp_workpaperid: 'wp-003', adp_level: { label: 'Manager' }, adp_reviewer: 'CA Priya Sharma', adp_decision: { label: 'Approve' }, adp_comments: 'Exceptions explained adequately by management.', adp_signedon: '2025-06-06' },
      { adp_reviewid: 'rv-002', adp_workpaperid: 'wp-003', adp_level: { label: 'Partner' }, adp_reviewer: 'CA Rohan Mehta',  adp_decision: { label: 'Approve' }, adp_comments: 'OK to proceed.', adp_signedon: '2025-06-07' }
    ];
    const w = fetchXml.match(/adp_workpaperid"\s+operator="eq"\s+value="([^"]+)"/i);
    if (w) return { results: { entities: all.filter(r => r.adp_workpaperid === w[1]) } };
    return { results: { entities: all } };
  }

  if (/<entity\s+name="adp_clientrequest"/i.test(fetchXml)) {
    const all = [
      { adp_clientrequestid: 'cr-001', adp_auditengagementid: 'aud-001', adp_companyid: { id: '00000000-0000-0000-0000-000000000001', name: 'Acme Traders Pvt Ltd' }, adp_item: 'Bank confirmation — HDFC current account', adp_description: 'Signed bank confirmation as at 31-Mar-2025.', adp_duedate: '2025-06-20', adp_status: { label: 'Open' },      adp_assignee: 'client@acme.in', adp_evidenceurl: '', adp_requesttag: 'REQ-1024' },
      { adp_clientrequestid: 'cr-002', adp_auditengagementid: 'aud-001', adp_companyid: { id: '00000000-0000-0000-0000-000000000001', name: 'Acme Traders Pvt Ltd' }, adp_item: 'Inventory count sheets',                    adp_description: 'Signed PV sheets and reconciliation with books.', adp_duedate: '2025-06-15', adp_status: { label: 'Submitted' }, adp_assignee: 'client@acme.in', adp_evidenceurl: '#', adp_requesttag: 'REQ-1025' },
      { adp_clientrequestid: 'cr-003', adp_auditengagementid: 'aud-001', adp_companyid: { id: '00000000-0000-0000-0000-000000000001', name: 'Acme Traders Pvt Ltd' }, adp_item: 'Related-party transactions schedule',       adp_description: 'List of RPTs with nature, amount and approval reference.', adp_duedate: '2025-06-10', adp_status: { label: 'Overdue' },  adp_assignee: 'cfo@acme.in',    adp_evidenceurl: '', adp_requesttag: 'REQ-1026' },
      { adp_clientrequestid: 'cr-004', adp_auditengagementid: 'aud-002', adp_companyid: { id: '00000000-0000-0000-0000-000000000002', name: 'Beta Industries'      }, adp_item: 'GSTR-2B downloads (Apr-Mar)',              adp_description: 'All 12 months of 2B JSON downloads.', adp_duedate: '2025-06-25', adp_status: { label: 'Open' },      adp_assignee: 'gst@beta.in',    adp_evidenceurl: '', adp_requesttag: 'REQ-1027' },
      { adp_clientrequestid: 'cr-005', adp_auditengagementid: 'aud-003', adp_companyid: { id: '00000000-0000-0000-0000-000000000003', name: 'Gamma Foods LLP'      }, adp_item: 'IT GL access list',                        adp_description: 'Current IT GL access list to validate SoD.', adp_duedate: '2025-06-12', adp_status: { label: 'Accepted' }, adp_assignee: 'it@gamma.in',    adp_evidenceurl: '#', adp_requesttag: 'REQ-1028' }
    ];
    const e = fetchXml.match(/adp_auditengagementid"\s+operator="eq"\s+value="([^"]+)"/i);
    if (e && e[1] !== '') return { results: { entities: all.filter(x => x.adp_auditengagementid === e[1]) } };
    const cm = fetchXml.match(/adp_companyid"\s+operator="eq"\s+value="([^"]+)"/i);
    if (cm) { const ids = engagementsForCompany(cm[1]); return { results: { entities: all.filter(x => ids.includes(x.adp_auditengagementid)) } }; }
    return { results: { entities: all } };
  }

  if (/<entity\s+name="adp_auditlog"/i.test(fetchXml)) {
    const all = [
      { adp_auditlogid: 'log-001', adp_auditengagementid: 'aud-001', adp_action: { label: 'Create' },        adp_entityname: 'adp_auditengagement', adp_actor: 'CA Rohan Mehta',  adp_timestamp: '2025-05-15 10:14', adp_summary: 'Engagement started; 22 workpapers seeded.' },
      { adp_auditlogid: 'log-002', adp_auditengagementid: 'aud-001', adp_action: { label: 'SubmitForReview' }, adp_entityname: 'adp_workpaper',     adp_actor: 'Priya Sharma',    adp_timestamp: '2025-06-12 09:02', adp_summary: 'WP-001 submitted for review.' },
      { adp_auditlogid: 'log-003', adp_auditengagementid: 'aud-001', adp_action: { label: 'SignOff' },        adp_entityname: 'adp_workpaper',     adp_actor: 'CA Priya Sharma', adp_timestamp: '2025-06-06 17:40', adp_summary: 'Manager Approve on WP-003.' },
      { adp_auditlogid: 'log-004', adp_auditengagementid: 'aud-001', adp_action: { label: 'SignOff' },        adp_entityname: 'adp_workpaper',     adp_actor: 'CA Rohan Mehta',  adp_timestamp: '2025-06-07 11:11', adp_summary: 'Partner Approve on WP-003.' }
    ];
    const e = fetchXml.match(/adp_auditengagementid"\s+operator="eq"\s+value="([^"]+)"/i);
    if (e) return { results: { entities: all.filter(x => x.adp_auditengagementid === e[1]) } };
    return { results: { entities: all } };
  }

  if (/<entity\s+name="adp_auditprogram"/i.test(fetchXml)) {
    return { results: { entities: [
      { adp_auditprogramid: 'STAT-FY',  adp_code: 'STAT-FY',  adp_name: 'Statutory audit (full FY)',     adp_framework: { label: 'Statutory' }, adp_proceduresCount: 22, adp_defaultmaterialitypct: 1.5 },
      { adp_auditprogramid: 'GST-9C',   adp_code: 'GST-9C',   adp_name: 'GST 9C reconciliation',         adp_framework: { label: 'GST' },       adp_proceduresCount: 9,  adp_defaultmaterialitypct: 0.5 },
      { adp_auditprogramid: 'ICR',      adp_code: 'ICR',      adp_name: 'Internal controls review',       adp_framework: { label: 'Internal' },  adp_proceduresCount: 11, adp_defaultmaterialitypct: 2.0 },
      { adp_auditprogramid: 'TAX-44AB', adp_code: 'TAX-44AB', adp_name: 'Income-tax audit 44AB',          adp_framework: { label: 'Statutory' }, adp_proceduresCount: 8,  adp_defaultmaterialitypct: 1.0 }
    ]}};
  }

  // ============================================================================
  // Accounting Activities & Compliance (accounting.liquid / important-dates.liquid)
  // ============================================================================
  // Accountant / Operator see the full portfolio; Firm Admin / Client are
  // scoped to company 001 (mirrors the per-page company filter).
  const ACC_C1 = { id: '00000000-0000-0000-0000-000000000001', name: 'Acme Traders Pvt Ltd' };
  const ACC_C2 = { id: '00000000-0000-0000-0000-000000000002', name: 'Beta Industries' };
  const ACC_C3 = { id: '00000000-0000-0000-0000-000000000003', name: 'Gamma Foods LLP' };
  function accScope(rows, ctxObj) {
    const role = ctxObj.environments.__role || 'Accountant';
    const isPortfolio = role === 'Accountant' || role === 'Smartsoft Operator';
    return isPortfolio ? rows : rows.filter(r => r.adp_companyid && r.adp_companyid.id === ACC_C1.id);
  }

  if (/<entity\s+name="adp_voucher"/i.test(fetchXml)) {
    const all = [
      { adp_voucherid: 'vch-p1', adp_companyid: ACC_C1, adp_vouchertype: { label: 'Purchase' }, adp_date: '2026-05-26', adp_party: 'Sundar Steels Pvt Ltd', adp_reference: 'PINV-1187', adp_amount: '1,24,500', adp_status: { label: 'Posted' }, adp_narration: 'Raw material — MS plates' },
      { adp_voucherid: 'vch-p2', adp_companyid: ACC_C1, adp_vouchertype: { label: 'Purchase' }, adp_date: '2026-05-24', adp_party: 'Apex Packaging', adp_reference: 'PINV-1183', adp_amount: '38,200', adp_status: { label: 'Posted' }, adp_narration: 'Cartons & packing' },
      { adp_voucherid: 'vch-s1', adp_companyid: ACC_C1, adp_vouchertype: { label: 'Sales' }, adp_date: '2026-05-26', adp_party: 'Meridian Distributors', adp_reference: 'SINV-2207', adp_amount: '2,15,000', adp_status: { label: 'Posted' }, adp_narration: 'Finished goods dispatch' },
      { adp_voucherid: 'vch-s2', adp_companyid: ACC_C1, adp_vouchertype: { label: 'Sales' }, adp_date: '2026-05-23', adp_party: 'Citywide Retail', adp_reference: 'SINV-2203', adp_amount: '78,400', adp_status: { label: 'Posted' }, adp_narration: 'Counter sales' },
      { adp_voucherid: 'vch-r1', adp_companyid: ACC_C1, adp_vouchertype: { label: 'Receipt' }, adp_date: '2026-05-25', adp_party: 'Meridian Distributors', adp_reference: 'RCPT-560', adp_amount: '2,00,000', adp_status: { label: 'Posted' }, adp_narration: 'Against SINV-2190' },
      { adp_voucherid: 'vch-pay1', adp_companyid: ACC_C1, adp_vouchertype: { label: 'Payment' }, adp_date: '2026-05-25', adp_party: 'Sundar Steels Pvt Ltd', adp_reference: 'PAY-330', adp_amount: '1,00,000', adp_status: { label: 'Posted' }, adp_narration: 'Part payment PINV-1180' },
      { adp_voucherid: 'vch-b1', adp_companyid: ACC_C1, adp_vouchertype: { label: 'Bank' }, adp_date: '2026-05-25', adp_party: 'HDFC Bank — 4421', adp_reference: 'NEFT-99213', adp_amount: '2,00,000', adp_status: { label: 'Posted' }, adp_narration: 'Customer receipt credited' },
      { adp_voucherid: 'vch-b2', adp_companyid: ACC_C1, adp_vouchertype: { label: 'Bank' }, adp_date: '2026-05-24', adp_party: 'HDFC Bank — 4421', adp_reference: 'CHQ-771002', adp_amount: '1,00,000', adp_status: { label: 'Posted' }, adp_narration: 'Vendor payment cleared' },
      { adp_voucherid: 'vch-j1', adp_companyid: ACC_C1, adp_vouchertype: { label: 'Journal' }, adp_date: '2026-05-26', adp_party: 'Depreciation', adp_reference: 'JV-091', adp_amount: '24,750', adp_status: { label: 'Posted' }, adp_narration: 'Monthly depreciation provision' },
      { adp_voucherid: 'vch-j2', adp_companyid: ACC_C1, adp_vouchertype: { label: 'Journal' }, adp_date: '2026-05-26', adp_party: 'Audit fees payable', adp_reference: 'JV-092', adp_amount: '15,000', adp_status: { label: 'Draft' }, adp_narration: 'Provision — to review' },
      { adp_voucherid: 'vch-p3', adp_companyid: ACC_C2, adp_vouchertype: { label: 'Purchase' }, adp_date: '2026-05-25', adp_party: 'Orient Chemicals', adp_reference: 'PINV-77', adp_amount: '92,300', adp_status: { label: 'Posted' }, adp_narration: 'Solvents' },
      { adp_voucherid: 'vch-s3', adp_companyid: ACC_C2, adp_vouchertype: { label: 'Sales' }, adp_date: '2026-05-24', adp_party: 'Pharma Junction', adp_reference: 'SINV-410', adp_amount: '1,46,000', adp_status: { label: 'Posted' }, adp_narration: 'Bulk supply' },
      { adp_voucherid: 'vch-b3', adp_companyid: ACC_C2, adp_vouchertype: { label: 'Bank' }, adp_date: '2026-05-24', adp_party: 'ICICI Bank — 8890', adp_reference: 'IMPS-5521', adp_amount: '50,000', adp_status: { label: 'Posted' }, adp_narration: 'Supplier advance' },
      { adp_voucherid: 'vch-s4', adp_companyid: ACC_C3, adp_vouchertype: { label: 'Sales' }, adp_date: '2026-05-23', adp_party: 'Freshmart', adp_reference: 'SINV-118', adp_amount: '64,800', adp_status: { label: 'Posted' }, adp_narration: 'Weekly order' }
    ];
    return { results: { entities: accScope(all, ctx) } };
  }

  if (/<entity\s+name="adp_bankrecon"/i.test(fetchXml)) {
    const all = [
      { adp_bankreconid: 'br-1', adp_companyid: ACC_C1, adp_date: '2026-05-25', adp_particulars: 'NEFT from Meridian Distributors', adp_bookamount: '2,00,000', adp_bankamount: '2,00,000', adp_status: { label: 'Matched' } },
      { adp_bankreconid: 'br-2', adp_companyid: ACC_C1, adp_date: '2026-05-24', adp_particulars: 'Cheque 771002 to Sundar Steels', adp_bookamount: '1,00,000', adp_bankamount: '1,00,000', adp_status: { label: 'Matched' } },
      { adp_bankreconid: 'br-3', adp_companyid: ACC_C1, adp_date: '2026-05-22', adp_particulars: 'Bank charges (not in books)', adp_bookamount: '0', adp_bankamount: '1,180', adp_status: { label: 'Unreconciled' } },
      { adp_bankreconid: 'br-4', adp_companyid: ACC_C1, adp_date: '2026-05-20', adp_particulars: 'Cheque 771000 — not presented', adp_bookamount: '45,000', adp_bankamount: '0', adp_status: { label: 'Unreconciled' } },
      { adp_bankreconid: 'br-5', adp_companyid: ACC_C2, adp_date: '2026-05-23', adp_particulars: 'IMPS supplier advance', adp_bookamount: '50,000', adp_bankamount: '50,000', adp_status: { label: 'Matched' } },
      { adp_bankreconid: 'br-6', adp_companyid: ACC_C2, adp_date: '2026-05-21', adp_particulars: 'Interest credited (not in books)', adp_bookamount: '0', adp_bankamount: '2,340', adp_status: { label: 'Unreconciled' } }
    ];
    return { results: { entities: accScope(all, ctx) } };
  }

  if (/<entity\s+name="adp_gst2b"/i.test(fetchXml)) {
    const all = [
      { adp_gst2bid: 'b-1', adp_companyid: ACC_C1, adp_gstin: '29ABCDE1234F1Z5', adp_supplier: 'Sundar Steels Pvt Ltd', adp_invoiceno: 'PINV-1187', adp_invoicedate: '2026-05-26', adp_taxable: '1,05,508', adp_igst: '0', adp_cgst: '9,496', adp_sgst: '9,496', adp_matchstatus: { label: 'Matched' } },
      { adp_gst2bid: 'b-2', adp_companyid: ACC_C1, adp_gstin: '27AAPCA9988K1ZP', adp_supplier: 'Apex Packaging', adp_invoiceno: 'AP-7741', adp_invoicedate: '2026-05-24', adp_taxable: '32,373', adp_igst: '5,827', adp_cgst: '0', adp_sgst: '0', adp_matchstatus: { label: 'Mismatch' } },
      { adp_gst2bid: 'b-3', adp_companyid: ACC_C1, adp_gstin: '29AAGCT2233L1Z9', adp_supplier: 'Tristar Logistics', adp_invoiceno: 'TL-5520', adp_invoicedate: '2026-05-20', adp_taxable: '18,000', adp_igst: '3,240', adp_cgst: '0', adp_sgst: '0', adp_matchstatus: { label: 'Missing in Books' } },
      { adp_gst2bid: 'b-4', adp_companyid: ACC_C1, adp_gstin: '29ABCDE1234F1Z5', adp_supplier: 'Orient Chemicals', adp_invoiceno: 'OC-2299', adp_invoicedate: '2026-05-18', adp_taxable: '40,000', adp_igst: '0', adp_cgst: '3,600', adp_sgst: '3,600', adp_matchstatus: { label: 'Missing in 2B' } },
      { adp_gst2bid: 'b-5', adp_companyid: ACC_C2, adp_gstin: '27AAPCA9988K1ZP', adp_supplier: 'Orient Chemicals', adp_invoiceno: 'PINV-77', adp_invoicedate: '2026-05-25', adp_taxable: '78,220', adp_igst: '14,080', adp_cgst: '0', adp_sgst: '0', adp_matchstatus: { label: 'Matched' } },
      { adp_gst2bid: 'b-6', adp_companyid: ACC_C2, adp_gstin: '27AAFCT7788M1ZQ', adp_supplier: 'BlueDart Express', adp_invoiceno: 'BD-9981', adp_invoicedate: '2026-05-19', adp_taxable: '6,500', adp_igst: '1,170', adp_cgst: '0', adp_sgst: '0', adp_matchstatus: { label: 'Mismatch' } }
    ];
    return { results: { entities: accScope(all, ctx) } };
  }

  if (/<entity\s+name="adp_gstvariance"/i.test(fetchXml)) {
    const all = [
      { adp_gstvarianceid: 'gv-1', adp_companyid: ACC_C1, adp_section: 'ITC (Books vs 2B)', adp_period: 'May 2026', adp_booksamount: '22,192', adp_portalamount: '24,815', adp_variance: '-2,623', adp_status: { label: 'At Risk' } },
      { adp_gstvarianceid: 'gv-2', adp_companyid: ACC_C1, adp_section: 'Outward (3B vs Books)', adp_period: 'May 2026', adp_booksamount: '52,812', adp_portalamount: '52,812', adp_variance: '0', adp_status: { label: 'On Track' } },
      { adp_gstvarianceid: 'gv-3', adp_companyid: ACC_C2, adp_section: 'ITC (Books vs 2B)', adp_period: 'May 2026', adp_booksamount: '14,080', adp_portalamount: '15,250', adp_variance: '-1,170', adp_status: { label: 'At Risk' } }
    ];
    return { results: { entities: accScope(all, ctx) } };
  }

  if (/<entity\s+name="adp_variancedoc"/i.test(fetchXml)) {
    const all = [
      { adp_variancedocid: 'vd-1', adp_companyid: ACC_C1, adp_name: 'AP-7741_supplier_invoice.pdf', adp_kind: 'Supplier invoice', adp_linkedto: 'PINV-1183 / 2B AP-7741', adp_uploadedon: '2026-05-26', adp_status: { label: 'Pending Review' } },
      { adp_variancedocid: 'vd-2', adp_companyid: ACC_C1, adp_name: 'Tristar_LR_5520.pdf', adp_kind: 'Transport bill', adp_linkedto: '2B TL-5520 (missing in books)', adp_uploadedon: '2026-05-25', adp_status: { label: 'Pending Review' } },
      { adp_variancedocid: 'vd-3', adp_companyid: ACC_C2, adp_name: 'BlueDart_BD9981_recon.xlsx', adp_kind: 'Reconciliation note', adp_linkedto: '2B BD-9981', adp_uploadedon: '2026-05-24', adp_status: { label: 'Resolved' } }
    ];
    return { results: { entities: accScope(all, ctx) } };
  }

  if (/<entity\s+name="adp_tds"/i.test(fetchXml)) {
    const all = [
      { adp_tdsid: 't-1', adp_companyid: ACC_C1, adp_section: '194C', adp_deductee: 'Tristar Logistics', adp_pan: 'AAGCT2233L', adp_amountpaid: '18,000', adp_rate: '1', adp_tdsamount: '180', adp_status: { label: 'Deducted' } },
      { adp_tdsid: 't-2', adp_companyid: ACC_C1, adp_section: '194J', adp_deductee: 'Nair & Associates', adp_pan: 'AABFN1122C', adp_amountpaid: '60,000', adp_rate: '10', adp_tdsamount: '6,000', adp_status: { label: 'Deposited' } },
      { adp_tdsid: 't-3', adp_companyid: ACC_C1, adp_section: '194Q', adp_deductee: 'Sundar Steels Pvt Ltd', adp_pan: 'ABCDE1234F', adp_amountpaid: '12,45,000', adp_rate: '0.1', adp_tdsamount: '1,245', adp_status: { label: 'Pending' } },
      { adp_tdsid: 't-4', adp_companyid: ACC_C2, adp_section: '194C', adp_deductee: 'BlueDart Express', adp_pan: 'AAFCT7788M', adp_amountpaid: '6,500', adp_rate: '1', adp_tdsamount: '65', adp_status: { label: 'Deducted' } }
    ];
    return { results: { entities: accScope(all, ctx) } };
  }

  if (/<entity\s+name="adp_form26as"/i.test(fetchXml)) {
    const all = [
      { adp_form26asid: 'f-1', adp_companyid: ACC_C1, adp_deductor: 'Meridian Distributors', adp_tan: 'MUMM12345A', adp_section: '194Q', adp_amount: '21,50,000', adp_taxcredit: '2,150', adp_status: { label: 'Matched' } },
      { adp_form26asid: 'f-2', adp_companyid: ACC_C1, adp_deductor: 'Citywide Retail', adp_tan: 'BLRC54321B', adp_section: '194Q', adp_amount: '7,84,000', adp_taxcredit: '784', adp_status: { label: 'Mismatch' } },
      { adp_form26asid: 'f-3', adp_companyid: ACC_C2, adp_deductor: 'Pharma Junction', adp_tan: 'DELP99887C', adp_section: '194Q', adp_amount: '14,60,000', adp_taxcredit: '1,460', adp_status: { label: 'Matched' } }
    ];
    return { results: { entities: accScope(all, ctx) } };
  }

  if (/<entity\s+name="adp_ais"/i.test(fetchXml)) {
    const all = [
      { adp_aisid: 'a-1', adp_companyid: ACC_C1, adp_category: 'GST turnover', adp_source: 'GSTN', adp_amount: '52,81,200', adp_status: { label: 'Reconciled' } },
      { adp_aisid: 'a-2', adp_companyid: ACC_C1, adp_category: 'Interest income', adp_source: 'HDFC Bank', adp_amount: '38,400', adp_status: { label: 'To Review' } },
      { adp_aisid: 'a-3', adp_companyid: ACC_C1, adp_category: 'TDS deducted', adp_source: 'Income Tax Dept', adp_amount: '2,934', adp_status: { label: 'Reconciled' } },
      { adp_aisid: 'a-4', adp_companyid: ACC_C2, adp_category: 'Cash deposits', adp_source: 'ICICI Bank', adp_amount: '1,20,000', adp_status: { label: 'To Review' } }
    ];
    return { results: { entities: accScope(all, ctx) } };
  }

  if (/<entity\s+name="adp_payroll"/i.test(fetchXml)) {
    const all = [
      { adp_payrollid: 'pr-1', adp_companyid: ACC_C1, adp_employee: 'Anil Kumar', adp_gross: '48,000', adp_deductions: '6,560', adp_net: '41,440', adp_status: { label: 'Processed' } },
      { adp_payrollid: 'pr-2', adp_companyid: ACC_C1, adp_employee: 'Sunita Rao', adp_gross: '36,000', adp_deductions: '5,160', adp_net: '30,840', adp_status: { label: 'Processed' } },
      { adp_payrollid: 'pr-3', adp_companyid: ACC_C1, adp_employee: 'Imran Shaikh', adp_gross: '28,000', adp_deductions: '4,270', adp_net: '23,730', adp_status: { label: 'Pending' } },
      { adp_payrollid: 'pr-4', adp_companyid: ACC_C2, adp_employee: 'Lata Menon', adp_gross: '52,000', adp_deductions: '6,240', adp_net: '45,760', adp_status: { label: 'Processed' } }
    ];
    return { results: { entities: accScope(all, ctx) } };
  }

  if (/<entity\s+name="adp_esi"/i.test(fetchXml)) {
    const all = [
      { adp_esiid: 'e-1', adp_companyid: ACC_C1, adp_employee: 'Imran Shaikh', adp_wages: '21,000', adp_eecontrib: '158', adp_ercontrib: '683' },
      { adp_esiid: 'e-2', adp_companyid: ACC_C1, adp_employee: 'Sunita Rao', adp_wages: '21,000', adp_eecontrib: '158', adp_ercontrib: '683' },
      { adp_esiid: 'e-3', adp_companyid: ACC_C2, adp_employee: 'Ramesh Pillai', adp_wages: '19,500', adp_eecontrib: '146', adp_ercontrib: '634' }
    ];
    return { results: { entities: accScope(all, ctx) } };
  }

  if (/<entity\s+name="adp_pf"/i.test(fetchXml)) {
    const all = [
      { adp_pfid: 'p-1', adp_companyid: ACC_C1, adp_employee: 'Anil Kumar', adp_basic: '24,000', adp_eepf: '2,880', adp_erpf: '2,880', adp_eps: '1,250' },
      { adp_pfid: 'p-2', adp_companyid: ACC_C1, adp_employee: 'Sunita Rao', adp_basic: '18,000', adp_eepf: '2,160', adp_erpf: '2,160', adp_eps: '1,250' },
      { adp_pfid: 'p-3', adp_companyid: ACC_C2, adp_employee: 'Lata Menon', adp_basic: '26,000', adp_eepf: '3,120', adp_erpf: '3,120', adp_eps: '1,250' }
    ];
    return { results: { entities: accScope(all, ctx) } };
  }

  // ==========================================================================
  // Monthly Close (BPO) — orchestration layer over service-delivery + accounting
  // ==========================================================================
  // A "close run" is one productised accounting service (e.g. GST Return,
  // Monthly Book Closure, Payroll) for one client company + period. It carries
  // SLA/TAT, maker-checker sign-off, client deliverables and billing status.
  // Each run is linked to a service-delivery engagement (adp_engagementid) and
  // its steps deep-link into the accounting workspace (accountingtab).
  const ACC_C4 = { id: '00000000-0000-0000-0000-000000000004', name: 'Delta Logistics' };

  if (/<entity\s+name="adp_closerun"/i.test(fetchXml)) {
    const all = [
      { adp_closerunid: 'cr-001', adp_companyid: ACC_C1, adp_period: 'May 2026', adp_processid: 'svc-close', adp_processname: 'Monthly Book Closure', adp_engagementid: 'eng-002', adp_stage: { label: 'Review' }, adp_status: { label: 'At Risk' }, adp_preparername: 'Rahul Mehta', adp_reviewername: 'Priya Sharma', adp_partnername: 'Anand Iyer', adp_startdate: '2026-05-05', adp_duedate: '2026-06-05', adp_sladays: 10, adp_slastatus: { label: 'At Risk' }, adp_tatdays: 8, adp_progress: 80, adp_billstatus: { label: 'Draft' }, adp_billamount: '18,000' },
      { adp_closerunid: 'cr-002', adp_companyid: ACC_C1, adp_period: 'May 2026', adp_processid: 'svc-gst', adp_processname: 'GST Return (Monthly)', adp_engagementid: 'eng-001', adp_stage: { label: 'Reconciliation' }, adp_status: { label: 'On Track' }, adp_preparername: 'Priya Sharma', adp_reviewername: 'Anand Iyer', adp_partnername: 'Anand Iyer', adp_startdate: '2026-06-01', adp_duedate: '2026-06-11', adp_sladays: 5, adp_slastatus: { label: 'On time' }, adp_tatdays: 2, adp_progress: 45, adp_billstatus: { label: 'Not billable' }, adp_billamount: '6,000' },
      { adp_closerunid: 'cr-003', adp_companyid: ACC_C2, adp_period: 'May 2026', adp_processid: 'svc-payroll', adp_processname: 'Payroll Run', adp_engagementid: 'eng-003', adp_stage: { label: 'Data Entry' }, adp_status: { label: 'On Track' }, adp_preparername: 'Aisha Khan', adp_reviewername: 'Rahul Mehta', adp_partnername: 'Anand Iyer', adp_startdate: '2026-05-28', adp_duedate: '2026-06-03', adp_sladays: 3, adp_slastatus: { label: 'At Risk' }, adp_tatdays: 4, adp_progress: 20, adp_billstatus: { label: 'Not billable' }, adp_billamount: '4,500' },
      { adp_closerunid: 'cr-004', adp_companyid: ACC_C3, adp_period: 'May 2026', adp_processid: 'svc-bank', adp_processname: 'Bank Reconciliation', adp_engagementid: 'eng-004', adp_stage: { label: 'Client Sign-off' }, adp_status: { label: 'On Track' }, adp_preparername: 'Priya Sharma', adp_reviewername: 'Rahul Mehta', adp_partnername: 'Anand Iyer', adp_startdate: '2026-05-22', adp_duedate: '2026-05-30', adp_sladays: 4, adp_slastatus: { label: 'On time' }, adp_tatdays: 3, adp_progress: 95, adp_billstatus: { label: 'Draft' }, adp_billamount: '5,000' },
      { adp_closerunid: 'cr-005', adp_companyid: ACC_C4, adp_period: 'Apr 2026', adp_processid: 'svc-close', adp_processname: 'Monthly Book Closure', adp_engagementid: 'eng-005', adp_stage: { label: 'Billed' }, adp_status: { label: 'Complete' }, adp_preparername: 'Rahul Mehta', adp_reviewername: 'Priya Sharma', adp_partnername: 'Anand Iyer', adp_startdate: '2026-05-02', adp_duedate: '2026-05-12', adp_sladays: 10, adp_slastatus: { label: 'On time' }, adp_tatdays: 9, adp_progress: 100, adp_billstatus: { label: 'Invoiced' }, adp_billamount: '18,000' },
      { adp_closerunid: 'cr-006', adp_companyid: ACC_C2, adp_period: 'Apr 2026', adp_processid: 'svc-gst', adp_processname: 'GST Return (Monthly)', adp_engagementid: 'eng-006', adp_stage: { label: 'Billed' }, adp_status: { label: 'Complete' }, adp_preparername: 'Rahul Mehta', adp_reviewername: 'Anand Iyer', adp_partnername: 'Anand Iyer', adp_startdate: '2026-05-01', adp_duedate: '2026-05-11', adp_sladays: 5, adp_slastatus: { label: 'Breached' }, adp_tatdays: 7, adp_progress: 100, adp_billstatus: { label: 'Paid' }, adp_billamount: '6,000' }
    ];
    const m = fetchXml.match(/adp_closerunid"\s+operator="eq"\s+value="([^"]+)"/i);
    if (m) return { results: { entities: all.filter(r => r.adp_closerunid === m[1]) } };
    return { results: { entities: accScope(all, ctx) } };
  }

  if (/<entity\s+name="adp_closestep"/i.test(fetchXml)) {
    const all = [
      // cr-001 Monthly Book Closure
      { adp_closestepid: 'cs-001', adp_closerunid: 'cr-001', adp_seq: 1, adp_stepname: 'Post purchase & sales vouchers', adp_accountingtab: 'entries', adp_status: { label: 'Done' }, adp_preparername: 'Rahul Mehta', adp_reviewername: 'Priya Sharma', adp_checkstatus: { label: 'Approved' }, adp_completedon: '2026-05-26' },
      { adp_closestepid: 'cs-002', adp_closerunid: 'cr-001', adp_seq: 2, adp_stepname: 'Receipts, payments & journals', adp_accountingtab: 'entries', adp_status: { label: 'Done' }, adp_preparername: 'Rahul Mehta', adp_reviewername: 'Priya Sharma', adp_checkstatus: { label: 'Approved' }, adp_completedon: '2026-05-27' },
      { adp_closestepid: 'cs-003', adp_closerunid: 'cr-001', adp_seq: 3, adp_stepname: 'Bank reconciliation', adp_accountingtab: 'recon', adp_status: { label: 'Done' }, adp_preparername: 'Rahul Mehta', adp_reviewername: 'Priya Sharma', adp_checkstatus: { label: 'Submitted' }, adp_completedon: '2026-05-28' },
      { adp_closestepid: 'cs-004', adp_closerunid: 'cr-001', adp_seq: 4, adp_stepname: 'GST 2B reconciliation & variance', adp_accountingtab: 'gst', adp_status: { label: 'In Progress' }, adp_preparername: 'Rahul Mehta', adp_reviewername: 'Priya Sharma', adp_checkstatus: { label: 'Maker' }, adp_completedon: '' },
      { adp_closestepid: 'cs-005', adp_closerunid: 'cr-001', adp_seq: 5, adp_stepname: 'TDS & tax review', adp_accountingtab: 'tds', adp_status: { label: 'Not Started' }, adp_preparername: 'Rahul Mehta', adp_reviewername: 'Priya Sharma', adp_checkstatus: { label: 'Maker' }, adp_completedon: '' },
      { adp_closestepid: 'cs-006', adp_closerunid: 'cr-001', adp_seq: 6, adp_stepname: 'Finalise trial balance & provisions', adp_accountingtab: 'entries', adp_status: { label: 'Not Started' }, adp_preparername: 'Rahul Mehta', adp_reviewername: 'Priya Sharma', adp_checkstatus: { label: 'Maker' }, adp_completedon: '' },
      // cr-002 GST Return
      { adp_closestepid: 'cs-101', adp_closerunid: 'cr-002', adp_seq: 1, adp_stepname: 'Import purchase register', adp_accountingtab: 'entries', adp_status: { label: 'Done' }, adp_preparername: 'Priya Sharma', adp_reviewername: 'Anand Iyer', adp_checkstatus: { label: 'Approved' }, adp_completedon: '2026-06-02' },
      { adp_closestepid: 'cs-102', adp_closerunid: 'cr-002', adp_seq: 2, adp_stepname: 'GSTR-2B reconciliation', adp_accountingtab: 'gst', adp_status: { label: 'In Progress' }, adp_preparername: 'Priya Sharma', adp_reviewername: 'Anand Iyer', adp_checkstatus: { label: 'Maker' }, adp_completedon: '' },
      { adp_closestepid: 'cs-103', adp_closerunid: 'cr-002', adp_seq: 3, adp_stepname: 'GSTR-1 preparation', adp_accountingtab: 'gst', adp_status: { label: 'Not Started' }, adp_preparername: 'Priya Sharma', adp_reviewername: 'Anand Iyer', adp_checkstatus: { label: 'Maker' }, adp_completedon: '' },
      { adp_closestepid: 'cs-104', adp_closerunid: 'cr-002', adp_seq: 4, adp_stepname: 'GSTR-3B preparation & filing', adp_accountingtab: 'gst', adp_status: { label: 'Not Started' }, adp_preparername: 'Priya Sharma', adp_reviewername: 'Anand Iyer', adp_checkstatus: { label: 'Maker' }, adp_completedon: '' },
      // cr-003 Payroll
      { adp_closestepid: 'cs-201', adp_closerunid: 'cr-003', adp_seq: 1, adp_stepname: 'Collect attendance & LOP', adp_accountingtab: 'payroll', adp_status: { label: 'In Progress' }, adp_preparername: 'Aisha Khan', adp_reviewername: 'Rahul Mehta', adp_checkstatus: { label: 'Maker' }, adp_completedon: '' },
      { adp_closestepid: 'cs-202', adp_closerunid: 'cr-003', adp_seq: 2, adp_stepname: 'Compute PF / ESI / PT', adp_accountingtab: 'payroll', adp_status: { label: 'Not Started' }, adp_preparername: 'Aisha Khan', adp_reviewername: 'Rahul Mehta', adp_checkstatus: { label: 'Maker' }, adp_completedon: '' },
      { adp_closestepid: 'cs-203', adp_closerunid: 'cr-003', adp_seq: 3, adp_stepname: 'Generate payslips & disbursal advice', adp_accountingtab: 'payroll', adp_status: { label: 'Not Started' }, adp_preparername: 'Aisha Khan', adp_reviewername: 'Rahul Mehta', adp_checkstatus: { label: 'Maker' }, adp_completedon: '' },
      // cr-004 Bank Reconciliation
      { adp_closestepid: 'cs-301', adp_closerunid: 'cr-004', adp_seq: 1, adp_stepname: 'Import bank statement', adp_accountingtab: 'recon', adp_status: { label: 'Done' }, adp_preparername: 'Priya Sharma', adp_reviewername: 'Rahul Mehta', adp_checkstatus: { label: 'Approved' }, adp_completedon: '2026-05-26' },
      { adp_closestepid: 'cs-302', adp_closerunid: 'cr-004', adp_seq: 2, adp_stepname: 'Match & clear unreconciled items', adp_accountingtab: 'recon', adp_status: { label: 'Done' }, adp_preparername: 'Priya Sharma', adp_reviewername: 'Rahul Mehta', adp_checkstatus: { label: 'Approved' }, adp_completedon: '2026-05-28' }
    ];
    const m = fetchXml.match(/adp_closerunid"\s+operator="eq"\s+value="([^"]+)"/i);
    if (m) return { results: { entities: all.filter(s => s.adp_closerunid === m[1]) } };
    return { results: { entities: all } };
  }

  if (/<entity\s+name="adp_deliverable"/i.test(fetchXml)) {
    const all = [
      { adp_deliverableid: 'dl-001', adp_closerunid: 'cr-001', adp_companyid: ACC_C1, adp_name: 'Trial Balance — May 2026.pdf', adp_kind: 'Trial balance', adp_status: { label: 'Ready' }, adp_sharedon: '', adp_signedon: '', adp_url: '#' },
      { adp_deliverableid: 'dl-002', adp_closerunid: 'cr-001', adp_companyid: ACC_C1, adp_name: 'P&L and Balance Sheet — May 2026.pdf', adp_kind: 'Financial statements', adp_status: { label: 'Draft' }, adp_sharedon: '', adp_signedon: '', adp_url: '#' },
      { adp_deliverableid: 'dl-101', adp_closerunid: 'cr-002', adp_companyid: ACC_C1, adp_name: 'GSTR-2B reconciliation — May 2026.xlsx', adp_kind: 'GST reconciliation', adp_status: { label: 'Draft' }, adp_sharedon: '', adp_signedon: '', adp_url: '#' },
      { adp_deliverableid: 'dl-301', adp_closerunid: 'cr-004', adp_companyid: ACC_C3, adp_name: 'Bank reconciliation statement — May 2026.pdf', adp_kind: 'Bank reconciliation', adp_status: { label: 'Shared' }, adp_sharedon: '2026-05-29', adp_signedon: '', adp_url: '#' },
      { adp_deliverableid: 'dl-501', adp_closerunid: 'cr-005', adp_companyid: ACC_C4, adp_name: 'Financial statements — Apr 2026.pdf', adp_kind: 'Financial statements', adp_status: { label: 'Client Signed' }, adp_sharedon: '2026-05-10', adp_signedon: '2026-05-12', adp_url: '#' }
    ];
    const m = fetchXml.match(/adp_closerunid"\s+operator="eq"\s+value="([^"]+)"/i);
    if (m) return { results: { entities: all.filter(d => d.adp_closerunid === m[1]) } };
    return { results: { entities: accScope(all, ctx) } };
  }

  if (/<entity\s+name="adp_signoff"/i.test(fetchXml)) {
    const all = [
      { adp_signoffid: 'so-001', adp_closerunid: 'cr-001', adp_stepid: 'cs-001', adp_level: { label: 'Preparer' }, adp_actor: 'Rahul Mehta', adp_decision: { label: 'Submitted' }, adp_ts: '2026-05-26 17:20', adp_comments: 'Purchase & sales vouchers posted.' },
      { adp_signoffid: 'so-002', adp_closerunid: 'cr-001', adp_stepid: 'cs-001', adp_level: { label: 'Reviewer' }, adp_actor: 'Priya Sharma', adp_decision: { label: 'Approved' }, adp_ts: '2026-05-27 10:05', adp_comments: 'Verified against source documents.' },
      { adp_signoffid: 'so-003', adp_closerunid: 'cr-001', adp_stepid: 'cs-003', adp_level: { label: 'Preparer' }, adp_actor: 'Rahul Mehta', adp_decision: { label: 'Submitted' }, adp_ts: '2026-05-28 16:40', adp_comments: 'Bank recon complete, 2 items pending bank confirmation.' },
      { adp_signoffid: 'so-501', adp_closerunid: 'cr-005', adp_stepid: '', adp_level: { label: 'Partner' }, adp_actor: 'Anand Iyer', adp_decision: { label: 'Approved' }, adp_ts: '2026-05-11 18:00', adp_comments: 'Final review done, release to client.' },
      { adp_signoffid: 'so-502', adp_closerunid: 'cr-005', adp_stepid: '', adp_level: { label: 'Client' }, adp_actor: 'Delta Logistics', adp_decision: { label: 'Signed' }, adp_ts: '2026-05-12 11:30', adp_comments: 'Accepted.' }
    ];
    const m = fetchXml.match(/adp_closerunid"\s+operator="eq"\s+value="([^"]+)"/i);
    if (m) return { results: { entities: all.filter(s => s.adp_closerunid === m[1]) } };
    return { results: { entities: all } };
  }

  if (/<entity\s+name="adp_complianceevent"/i.test(fetchXml)) {
    const all = [
      { adp_complianceeventid: 'ce-1', adp_companyid: ACC_C1, adp_title: 'GSTR-1 (May 2026)', adp_category: { label: 'GST' }, adp_period: 'May 2026', adp_duedate: '2026-06-11', adp_status: { label: 'Due Soon' }, adp_severity: { label: 'High' }, adp_reminderdays: 3, adp_owner: 'Priya Sharma' },
      { adp_complianceeventid: 'ce-2', adp_companyid: ACC_C1, adp_title: 'GSTR-3B (May 2026)', adp_category: { label: 'GST' }, adp_period: 'May 2026', adp_duedate: '2026-06-20', adp_status: { label: 'Upcoming' }, adp_severity: { label: 'High' }, adp_reminderdays: 3, adp_owner: 'Priya Sharma' },
      { adp_complianceeventid: 'ce-3', adp_companyid: ACC_C1, adp_title: 'TDS payment (May 2026)', adp_category: { label: 'TDS' }, adp_period: 'May 2026', adp_duedate: '2026-06-07', adp_status: { label: 'Due Soon' }, adp_severity: { label: 'High' }, adp_reminderdays: 2, adp_owner: 'Rahul Mehta' },
      { adp_complianceeventid: 'ce-4', adp_companyid: ACC_C1, adp_title: 'PF payment (May 2026)', adp_category: { label: 'PF' }, adp_period: 'May 2026', adp_duedate: '2026-06-15', adp_status: { label: 'Upcoming' }, adp_severity: { label: 'Medium' }, adp_reminderdays: 3, adp_owner: 'Aisha Khan' },
      { adp_complianceeventid: 'ce-5', adp_companyid: ACC_C1, adp_title: 'ESI payment (May 2026)', adp_category: { label: 'ESI' }, adp_period: 'May 2026', adp_duedate: '2026-06-15', adp_status: { label: 'Upcoming' }, adp_severity: { label: 'Medium' }, adp_reminderdays: 3, adp_owner: 'Aisha Khan' },
      { adp_complianceeventid: 'ce-6', adp_companyid: ACC_C1, adp_title: 'GSTR-3B (Apr 2026)', adp_category: { label: 'GST' }, adp_period: 'Apr 2026', adp_duedate: '2026-05-20', adp_status: { label: 'Overdue' }, adp_severity: { label: 'High' }, adp_reminderdays: 3, adp_owner: 'Rahul Mehta' },
      { adp_complianceeventid: 'ce-7', adp_companyid: ACC_C2, adp_title: 'TDS return 26Q (Q4 FY26)', adp_category: { label: 'TDS' }, adp_period: 'Q4 FY26', adp_duedate: '2026-05-31', adp_status: { label: 'Overdue' }, adp_severity: { label: 'High' }, adp_reminderdays: 7, adp_owner: 'Rahul Mehta' },
      { adp_complianceeventid: 'ce-8', adp_companyid: ACC_C2, adp_title: 'GSTR-1 (May 2026)', adp_category: { label: 'GST' }, adp_period: 'May 2026', adp_duedate: '2026-06-11', adp_status: { label: 'Due Soon' }, adp_severity: { label: 'High' }, adp_reminderdays: 3, adp_owner: 'Rahul Mehta' },
      { adp_complianceeventid: 'ce-9', adp_companyid: ACC_C1, adp_title: 'Advance tax — Q1 instalment', adp_category: { label: 'Income Tax' }, adp_period: 'Q1 FY27', adp_duedate: '2026-06-15', adp_status: { label: 'Upcoming' }, adp_severity: { label: 'Medium' }, adp_reminderdays: 5, adp_owner: 'Priya Sharma' },
      { adp_complianceeventid: 'ce-10', adp_companyid: ACC_C3, adp_title: 'GSTR-1 (May 2026)', adp_category: { label: 'GST' }, adp_period: 'May 2026', adp_duedate: '2026-06-11', adp_status: { label: 'Due Soon' }, adp_severity: { label: 'High' }, adp_reminderdays: 3, adp_owner: 'Aisha Khan' },
      { adp_complianceeventid: 'ce-11', adp_companyid: ACC_C1, adp_title: 'GSTR-3B (Apr 2026) — filed', adp_category: { label: 'GST' }, adp_period: 'Apr 2026', adp_duedate: '2026-05-20', adp_status: { label: 'Filed' }, adp_severity: { label: 'Low' }, adp_reminderdays: 0, adp_owner: 'Priya Sharma' }
    ];
    return { results: { entities: accScope(all, ctx) } };
  }

  return { results: { entities: [] } };
}

// --- Render orchestration -----------------------------------------------------
async function fetchText(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status}`);
  return res.text();
}

const _partialCache = {};
async function loadPartial(name) {
  if (!PARTIALS[name]) return '';
  if (!_partialCache[name]) _partialCache[name] = fetchText(PARTIALS[name]);
  return _partialCache[name];
}

async function renderPage(pageId) {
  const page = PAGES.find(p => p.id === pageId);
  if (!page) return;
  const pageSrc = await fetchText(page.file);

  // Inline known partial includes since LiquidJS in-browser has no file system.
  // Supports: {% include 'adp-user-context' %}, {% include 'adp-shell-open' %}, {% include 'adp-shell-close' %}.
  // Any 'with' parameters should be set via {% assign %} before the include
  // (the preview ignores the 'with' clause and strips it).
  let inlined = pageSrc;
  const includeRe = /{%\s*include\s+'([\w-]+)'(?:\s+with[^%]*)?\s*%}/g;
  const names = new Set(); let m;
  while ((m = includeRe.exec(pageSrc))) names.add(m[1]);
  const sources = {};
  await Promise.all(Array.from(names).map(async n => { sources[n] = await loadPartial(n); }));
  inlined = inlined.replace(includeRe, (_full, n) => sources[n] || '');

  const toggleSignedIn = document.getElementById('authToggle').checked;
  const signedIn = toggleSignedIn || !!msalAccount;
  const role = document.getElementById('roleSelect').value;

  const params = new URLSearchParams(location.search);
  const data = {
    __role: role,
    request: { params: {
      id: params.get('company') || params.get('id') || '',
      report: params.get('report') || '',
      company: params.get('company') || '',
      engagement: params.get('engagement') || '',
      processid: params.get('processid') || '',
      period: params.get('period') || '',
      closerun: params.get('closerun') || '',
      tab: params.get('tab') || ''
    }},
    user: signedIn ? {
      id: msalAccount ? (msalAccount.localAccountId || msalAccount.homeAccountId) : 'user-guid-001',
      fullname: msalAccount ? (msalAccount.name || msalAccount.username) : 'Priya Sharma',
      identity_provider_object_id: msalAccount ? (msalAccount.localAccountId || 'entra-oid-001') : 'entra-oid-001'
    } : { id: null, fullname: '', identity_provider_object_id: '' },
    adp_powerbi_workspaceid: '03623be0-6e17-43ba-9fe5-947e9b67c823',
    adp_powerbi_reportid: '',
    adp_rdpfunctionbaseurl: 'preview://stub',
    adp_rdpfunctionkey: ''
  };

  try {
    const html = await engine.parseAndRender(inlined, data);
    document.getElementById('renderTarget').innerHTML = html;
    rewriteInternalLinks();
    rewriteTelegramIframes();
    promoteDesignSystem();
    executeInlineScripts();
  } catch (err) {
    document.getElementById('renderTarget').innerHTML =
      `<div class="placeholder"><strong>Render error:</strong> ${escapeHtml(err.message)}</div>`;
  }
}

// Move the central preview.css <link> to the end of <body> after each render
// so it sits after any inline <style> blocks injected from the page, winning
// at equal CSS specificity via source order. This lets the global design
// system override per-page legacy styles without editing every page.
function promoteDesignSystem() {
  const link = document.querySelector('link[href$="preview.css"]');
  if (link && link.parentElement !== document.body) {
    document.body.appendChild(link);
  } else if (link) {
    // already in body — re-append to push to end past the just-rendered styles
    document.body.appendChild(link);
  }
}

// Scripts injected via innerHTML are inert; clone them into live <script> nodes.
function executeInlineScripts() {
  const target = document.getElementById('renderTarget');
  target.querySelectorAll('script').forEach(old => {
    const s = document.createElement('script');
    for (const a of old.attributes) s.setAttribute(a.name, a.value);
    s.text = old.textContent;
    old.replaceWith(s);
  });
}

// Intercept fetch calls to the stub RDP endpoint so the Launch Tally page
// works in the preview without a real Azure Function.
const originalFetch = window.fetch.bind(window);
window.fetch = function (input, init) {
  const url = typeof input === 'string' ? input : (input && input.url) || '';
  if (url.startsWith('preview://stub/api/rdp/generate')) {
    const u = new URL(url.replace('preview://stub', 'https://stub.local'));
    const companyId = u.searchParams.get('companyId') || 'preview-company';
    // In the preview, hand back a direct URL to the static SmartsoftTallyServer.rdp
    // served by Five Server. The function app does the same with a signed token.
    return Promise.resolve(new Response(JSON.stringify({
      companyId: companyId,
      sessionHost: '20.244.8.237:3389',
      rdpDownloadUrl: '/preview/rdp/SmartsoftTallyServer.rdp'
    }), { status: 200, headers: { 'content-type': 'application/json' } }));
  }
  return originalFetch(input, init);
};

// Map portal paths -> preview page ids so in-portal links work in the harness.
const PATH_TO_PAGE = {
  '/': 'index',
  '/dashboard': 'dashboard',
  '/companies': 'clients',
  '/clients': 'clients',
  '/documents': 'documents',
  '/inbox': 'inbox',
  '/launch-tally': 'launch-tally',
  '/reports': 'insights',
  '/reports/company': 'insights',
  '/report': 'insights',
  '/insights': 'insights',
  '/assistant': 'agents',
  '/agents': 'agents',
  '/pricing': 'billing',
  '/subscription': 'billing',
  '/billing': 'billing',
  '/operator': 'operator',
  '/services': 'service-delivery',
  '/service-delivery': 'service-delivery',
  '/monthly-close': 'monthly-close',
  '/accounting': 'accounting',
  '/important-dates': 'important-dates',
  '/onboarding': 'clients',
  '/settings': 'operator',
  '/team': 'team',
  '/teams': 'teams',
  '/audit': 'audit',
  '/audit-engagement': 'audit-engagement',
  '/workpaper': 'workpaper',
  '/audit-exceptions': 'audit-exceptions',
  '/client-requests': 'client-requests'
};

// Preview-only: route t.me iframes through our local proxy so X-Frame-Options
// from Telegram doesn't block embedding.
function rewriteTelegramIframes() {
  if (location.hostname !== '127.0.0.1' && location.hostname !== 'localhost') return;
  const proxy = `http://${location.hostname}:5501`;
  document.querySelectorAll('#renderTarget iframe[src^="https://t.me/"]').forEach(f => {
    f.src = f.src.replace(/^https:\/\/t\.me/, proxy);
  });
  window.ADP_TG_FILES_URL = `${proxy}/api/files?channel=smart_tally`;
  window.ADP_TG_POSTS_URL = `${proxy}/api/posts?channel=smart_tally`;
}

function rewriteInternalLinks() {
  const target = document.getElementById('renderTarget');
  target.querySelectorAll('a[href]').forEach(a => {
    const href = a.getAttribute('href');
    if (!href || /^https?:|^mailto:|^#/i.test(href)) return;
    // Split path, query and hash so /billing#active and /reports/company?id=xxx both resolve.
    const hIdx = href.indexOf('#');
    const beforeHash = hIdx === -1 ? href : href.slice(0, hIdx);
    const hashFragment = hIdx === -1 ? '' : href.slice(hIdx);
    const qIdx = beforeHash.indexOf('?');
    const path = qIdx === -1 ? beforeHash : beforeHash.slice(0, qIdx);
    const queryString = qIdx === -1 ? '' : beforeHash.slice(qIdx + 1);
    const pageId = PATH_TO_PAGE[path];
    if (!pageId) return;
    a.addEventListener('click', e => {
      e.preventDefault();
      const sel = document.getElementById('pageSelect');
      const url = new URL(location.href);
      // Clear previous deep-link params and apply new ones.
      ['id', 'company', 'report'].forEach(k => url.searchParams.delete(k));
      if (queryString) {
        new URLSearchParams(queryString).forEach((v, k) => url.searchParams.set(k, v));
      }
      url.searchParams.set('page', pageId);
      url.hash = hashFragment || '';
      history.replaceState(null, '', url);
      sel.value = pageId;
      renderPage(pageId);
    });
  });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

function init() {
  const sel = document.getElementById('pageSelect');
  PAGES.forEach(p => {
    const o = document.createElement('option');
    o.value = p.id;
    o.textContent = p.label;
    sel.appendChild(o);
  });
  const params = new URLSearchParams(location.search);
  if (params.get('page')) sel.value = params.get('page');

  const triggerRender = () => {
    const url = new URL(location.href);
    url.searchParams.set('page', sel.value);
    history.replaceState(null, '', url);
    renderPage(sel.value);
  };

  sel.addEventListener('change', triggerRender);
  document.getElementById('roleSelect').addEventListener('change', triggerRender);
  document.getElementById('authToggle').addEventListener('change', triggerRender);

  initMsal(triggerRender);

  triggerRender();
}

// --- Microsoft 365 sign-in (MSAL) --------------------------------------------
// Acquires a delegated Graph token for the signed-in user so pages such as
// Documents can list real SharePoint content from intelliblend.sharepoint.com.
let msalApp = null;
let msalAccount = null;

async function initMsal(onChange) {
  const cfg = window.ADP_AUTH;
  const signInBtn  = document.getElementById('msalSignIn');
  const signOutBtn = document.getElementById('msalSignOut');
  const userLabel  = document.getElementById('msalUser');

  if (!cfg || !cfg.clientId || !window.msal) {
    signInBtn.disabled = true;
    var reason = !cfg ? 'auth-config.js did not load (window.ADP_AUTH missing)'
               : !cfg.clientId ? 'auth-config.js loaded but clientId is empty'
               : 'MSAL library did not load (window.msal missing)';
    signInBtn.title = reason;
    signInBtn.textContent = 'Sign in (disabled)';
    console.warn('[ADP preview] Sign-in disabled:', reason);
    return;
  }

  msalApp = new msal.PublicClientApplication({
    auth: {
      clientId:    cfg.clientId,
      authority:   `https://login.microsoftonline.com/${cfg.tenantId}`,
      redirectUri: cfg.redirectUri
    },
    cache: { cacheLocation: 'sessionStorage' }
  });
  await msalApp.initialize();

  const accounts = msalApp.getAllAccounts();
  if (accounts.length > 0) {
    msalAccount = accounts[0];
    showSignedIn();
  }

  signInBtn.addEventListener('click', async () => {
    try {
      const result = await msalApp.loginPopup({ scopes: cfg.scopes });
      msalAccount = result.account;
      showSignedIn();
      onChange && onChange();
    } catch (err) {
      alert('Sign-in failed: ' + err.message);
    }
  });

  signOutBtn.addEventListener('click', async () => {
    await msalApp.logoutPopup({ account: msalAccount });
    msalAccount = null;
    showSignedOut();
    onChange && onChange();
  });

  function showSignedIn() {
    signInBtn.hidden = true;
    signOutBtn.hidden = false;
    userLabel.textContent = msalAccount.username;
    const t = document.getElementById('authToggle');
    if (t && !t.checked) { t.checked = true; onChange && onChange(); }
  }
  function showSignedOut() {
    signInBtn.hidden = false;
    signOutBtn.hidden = true;
    userLabel.textContent = '';
    const t = document.getElementById('authToggle');
    if (t && t.checked) { t.checked = false; onChange && onChange(); }
  }
}

// Exposed for inline page scripts (e.g. documents.liquid).
window.adpGraph = {
  isSignedIn: () => !!msalAccount,
  account:    () => msalAccount,
  config:     () => window.ADP_AUTH,
  async getToken() {
    if (!msalApp || !msalAccount) throw new Error('Not signed in');
    const scopes = window.ADP_AUTH.scopes;
    try {
      const r = await msalApp.acquireTokenSilent({ account: msalAccount, scopes });
      return r.accessToken;
    } catch {
      const r = await msalApp.acquireTokenPopup({ account: msalAccount, scopes });
      return r.accessToken;
    }
  },
  async getTokenFor(scopes) {
    if (!msalApp || !msalAccount) throw new Error('Not signed in');
    try {
      const r = await msalApp.acquireTokenSilent({ account: msalAccount, scopes });
      return r.accessToken;
    } catch {
      const r = await msalApp.acquireTokenPopup({ account: msalAccount, scopes });
      return r.accessToken;
    }
  },
  async call(path) {
    const token = await this.getToken();
    const res = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error(`Graph ${res.status}: ${await res.text()}`);
    return res.json();
  }
};

init();
