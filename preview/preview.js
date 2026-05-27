// Static client-side preview of Power Pages Liquid templates.
// Renders each .liquid page with stubbed Dataverse data using LiquidJS.

const PAGES = [
  // ---- Primary hubs (new IA) ---------------------------------------------
  { id: 'dashboard',        label: 'Dashboard / My Day',         file: '../power-platform/portal/pages/dashboard.liquid' },
  { id: 'clients',          label: 'Clients (hub)',              file: '../power-platform/portal/pages/clients.liquid' },
  { id: 'inbox',            label: 'Inbox (Data Capture)',       file: '../power-platform/portal/pages/inbox.liquid' },
  { id: 'service-delivery', label: 'Service Delivery',           file: '../power-platform/portal/pages/service-delivery.liquid' },
  { id: 'insights',         label: 'Insights (Reports hub)',     file: '../power-platform/portal/pages/insights.liquid' },
  { id: 'agents',           label: 'Agents (incl. Smart Agent)', file: '../power-platform/portal/pages/agents.liquid' },
  { id: 'billing',          label: 'Billing (Plans + Subscription)', file: '../power-platform/portal/pages/billing.liquid' },
  { id: 'operator',         label: 'Operator Console (Smartsoft)', file: '../power-platform/portal/pages/operator.liquid' },
  // ---- Secondary / utilities --------------------------------------------
  { id: 'documents',        label: 'Documents',                  file: '../power-platform/portal/pages/documents.liquid' },
  { id: 'launch-tally',     label: 'Launch Tally',               file: '../power-platform/portal/pages/launch-tally.liquid' },
  { id: 'teams',            label: 'Microsoft Teams',            file: '../power-platform/portal/pages/teams.liquid' },
  { id: 'index',            label: 'Home (public landing)',      file: '../power-platform/portal/pages/index.liquid' },
  // ---- Deprecated / redirect stubs (still linkable for bookmarks) -------
  { id: 'companies',        label: 'Companies (→ Clients)',      file: '../power-platform/portal/pages/companies.liquid' },
  { id: 'onboarding',       label: 'Onboarding (→ Clients)',     file: '../power-platform/portal/pages/onboarding.liquid' },
  { id: 'reports',          label: 'Reports (→ Insights)',       file: '../power-platform/portal/pages/reports.liquid' },
  { id: 'reports-company',  label: 'Reports — Company (→ Insights)', file: '../power-platform/portal/pages/reports-company.liquid' },
  { id: 'report-powerbi',   label: 'PBI report (→ Insights)',    file: '../power-platform/portal/pages/report-powerbi.liquid' },
  { id: 'assistant',        label: 'Assistant (→ Agents)',       file: '../power-platform/portal/pages/assistant.liquid' },
  { id: 'pricing',          label: 'Pricing (→ Billing)',        file: '../power-platform/portal/pages/pricing.liquid' },
  { id: 'subscription',     label: 'Subscription (→ Billing)',   file: '../power-platform/portal/pages/subscription.liquid' }
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
    const inner = this.tokens.map(t => t.getText()).join('');
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
    return {
      results: {
        entities: [{
          adp_companyid: { id: '00000000-0000-0000-0000-000000000001', name: 'Acme Traders Pvt Ltd' },
          adp_role: { label: role, value: 1 },
          'company.adp_sharepointsiteurl': 'https://intelliblend.sharepoint.com/sites/Smartsoft646'
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
    const filteredByCompany = /companyid/i.test(fetchXml) && role !== 'Accountant'
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
    const filtered = /companyid/i.test(fetchXml) && role !== 'Accountant'
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
      report: params.get('report') || ''
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
  '/companies': 'companies',
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
  '/onboarding': 'clients',
  '/settings': 'operator',
  '/teams': 'teams'
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
    // Split path and query so /reports/company?id=xxx maps to page 'reports-company' with id preserved.
    const qIdx = href.indexOf('?');
    const path = qIdx === -1 ? href : href.slice(0, qIdx);
    const queryString = qIdx === -1 ? '' : href.slice(qIdx + 1);
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
