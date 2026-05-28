// audit-exceptions.pq
// ---------------------------------------------------------------------------
// Audit exception engine — produces a unified Exceptions table feeding
// Flow_RunExceptionEngine and the /audit-exceptions portal page.
//
// Inputs (parameters):
//   prmCompanyId          - GUID of adp_company being audited
//   prmPeriodFrom         - period start (date)
//   prmPeriodTo           - period end (date)
//   prmTallyDatasetUrl    - OData URL to ingested Tally journal data
//   prmBankDatasetUrl     - OData URL to bank statements
//   prmGstDatasetUrl      - OData URL to GST returns + 2B
//   prmPayrollDatasetUrl  - OData URL to payroll registers
//   prmRulesUrl           - URL to power-platform/catalog/exception-rules.json
//
// Output shape (matches adp_exception):
//   { RuleCode, RuleName, Source, Severity, Amount, Description, DetectedOn, CompanyId }
// ---------------------------------------------------------------------------

let
    // ------- Parameters -------
    prmCompanyId         = "{{COMPANY_ID}}",
    prmPeriodFrom        = #date(2024, 4, 1),
    prmPeriodTo          = #date(2025, 3, 31),
    prmTallyDatasetUrl   = "https://intelliblend.sharepoint.com/...",
    prmBankDatasetUrl    = "https://intelliblend.sharepoint.com/...",
    prmGstDatasetUrl     = "https://intelliblend.sharepoint.com/...",
    prmPayrollDatasetUrl = "https://intelliblend.sharepoint.com/...",
    prmRulesUrl          = "https://intelliblend.sharepoint.com/sites/Smartsoft646/catalog/exception-rules.json",

    // ------- Helpers -------
    Rules = Json.Document(Web.Contents(prmRulesUrl)),
    RuleByCode = (code as text) as record =>
        List.First(List.Select(Rules, each [code] = code), [code = code, name = code, severity = "Medium", source = "Tally", params = []]),

    AsRow = (ruleCode as text, amount as nullable number, description as text, sourceOverride as nullable text) =>
        let r = RuleByCode(ruleCode) in [
            CompanyId   = prmCompanyId,
            RuleCode    = ruleCode,
            RuleName    = r[name],
            Source      = if sourceOverride = null then r[source] else sourceOverride,
            Severity    = r[severity],
            Amount      = amount,
            Description = description,
            DetectedOn  = DateTime.LocalNow()
        ],

    // ------- Source loads (placeholder paths) -------
    SafeLoad = (url as text) =>
        try OData.Feed(url) otherwise #table({"None"}, {}),
    Tally   = SafeLoad(prmTallyDatasetUrl),
    Bank    = SafeLoad(prmBankDatasetUrl),
    Gst     = SafeLoad(prmGstDatasetUrl),
    Payroll = SafeLoad(prmPayrollDatasetUrl),

    // ------- Journal entry exceptions -------
    JE_Weekend = Table.SelectRows(
        Tally,
        each Date.DayOfWeek([VoucherDate], Day.Monday) >= 5
    ),
    Ex_JE_Weekend = Table.FromList(
        List.Transform(Table.ToRecords(JE_Weekend),
            each AsRow("JE.WEEKEND", [Amount], "Voucher " & [VoucherNo] & " posted on weekend (" & Date.ToText([VoucherDate]) & ")", null)),
        Splitter.SplitByNothing(),
        type table [CompanyId=text, RuleCode=text, RuleName=text, Source=text, Severity=text, Amount=number, Description=text, DetectedOn=datetime]
    ),

    JE_AfterClose = Table.SelectRows(Tally, each [VoucherDate] > prmPeriodTo),
    Ex_JE_AfterClose = Table.FromList(
        List.Transform(Table.ToRecords(JE_AfterClose),
            each AsRow("JE.AFTER_CLOSE", [Amount], "Post-period entry " & [VoucherNo], null)),
        Splitter.SplitByNothing(),
        type table [CompanyId=text, RuleCode=text, RuleName=text, Source=text, Severity=text, Amount=number, Description=text, DetectedOn=datetime]
    ),

    JE_Round = Table.SelectRows(Tally, each Number.Mod([Amount], 100000) = 0 and [Amount] >= 100000),
    Ex_JE_Round = Table.FromList(
        List.Transform(Table.ToRecords(JE_Round),
            each AsRow("JE.ROUND_AMOUNT", [Amount], "Round amount voucher " & [VoucherNo], null)),
        Splitter.SplitByNothing(),
        type table [CompanyId=text, RuleCode=text, RuleName=text, Source=text, Severity=text, Amount=number, Description=text, DetectedOn=datetime]
    ),

    JE_Dup = Table.Group(
        Tally, {"PartyName", "Amount", "VoucherDate"},
        {{"Cnt", each Table.RowCount(_), Int64.Type}, {"Vouchers", each Text.Combine([VoucherNo], ", "), type text}}
    ),
    Ex_JE_Dup = Table.FromList(
        List.Transform(Table.ToRecords(Table.SelectRows(JE_Dup, each [Cnt] > 1)),
            each AsRow("JE.DUPLICATE", [Amount], "Duplicate JE on " & Date.ToText([VoucherDate]) & " — " & [Vouchers], null)),
        Splitter.SplitByNothing(),
        type table [CompanyId=text, RuleCode=text, RuleName=text, Source=text, Severity=text, Amount=number, Description=text, DetectedOn=datetime]
    ),

    // ------- Bank exceptions -------
    Bank_Large = Table.SelectRows(Bank, each [Type] = "DR" and [Amount] >= 1000000),
    Ex_Bank_Large = Table.FromList(
        List.Transform(Table.ToRecords(Bank_Large),
            each AsRow("BANK.LARGE_OUTFLOW", [Amount], "Large outflow " & [Particulars], "Bank")),
        Splitter.SplitByNothing(),
        type table [CompanyId=text, RuleCode=text, RuleName=text, Source=text, Severity=text, Amount=number, Description=text, DetectedOn=datetime]
    ),

    Bank_Unrec = Table.SelectRows(Bank, each [ReconciledOn] = null and Duration.Days(DateTime.LocalNow() - [TxnDate]) > 30),
    Ex_Bank_Unrec = Table.FromList(
        List.Transform(Table.ToRecords(Bank_Unrec),
            each AsRow("BANK.UNRECONCILED.30D", [Amount], "Unreconciled >30d: " & [Particulars], "Bank")),
        Splitter.SplitByNothing(),
        type table [CompanyId=text, RuleCode=text, RuleName=text, Source=text, Severity=text, Amount=number, Description=text, DetectedOn=datetime]
    ),

    // ------- GST exceptions -------
    Gst_BooksVs3b = Table.SelectRows(Gst, each Number.Abs([BooksOutwardTax] - [Gstr3bOutwardTax]) > 10000),
    Ex_Gst_BooksVs3b = Table.FromList(
        List.Transform(Table.ToRecords(Gst_BooksVs3b),
            each AsRow("GST.BOOKS_VS_3B", Number.Abs([BooksOutwardTax] - [Gstr3bOutwardTax]),
                "Books vs 3B variance for " & [TaxPeriod], "GST")),
        Splitter.SplitByNothing(),
        type table [CompanyId=text, RuleCode=text, RuleName=text, Source=text, Severity=text, Amount=number, Description=text, DetectedOn=datetime]
    ),

    Gst_ItcVs2b = Table.SelectRows(Gst, each Number.Abs([BooksItc] - [Gstr2bItc]) > 5000),
    Ex_Gst_ItcVs2b = Table.FromList(
        List.Transform(Table.ToRecords(Gst_ItcVs2b),
            each AsRow("GST.ITC_VS_2B", Number.Abs([BooksItc] - [Gstr2bItc]),
                "ITC books vs 2B mismatch " & [TaxPeriod], "GST")),
        Splitter.SplitByNothing(),
        type table [CompanyId=text, RuleCode=text, RuleName=text, Source=text, Severity=text, Amount=number, Description=text, DetectedOn=datetime]
    ),

    // ------- Payroll / TDS / s40A(3) -------
    Payroll_NegNet = Table.SelectRows(Payroll, each [NetPay] < 0),
    Ex_Payroll_NegNet = Table.FromList(
        List.Transform(Table.ToRecords(Payroll_NegNet),
            each AsRow("PAYROLL.NEGATIVE_NET", [NetPay], "Negative net pay for " & [EmpCode], "Payroll")),
        Splitter.SplitByNothing(),
        type table [CompanyId=text, RuleCode=text, RuleName=text, Source=text, Severity=text, Amount=number, Description=text, DetectedOn=datetime]
    ),

    Cash_40A3 = Table.SelectRows(Tally, each [Mode] = "Cash" and [Amount] > 10000),
    Ex_Cash_40A3 = Table.FromList(
        List.Transform(Table.ToRecords(Cash_40A3),
            each AsRow("S40A3.CASH_PAYMENT", [Amount], "Cash payment > 10k to " & [PartyName] & " (s40A(3))", null)),
        Splitter.SplitByNothing(),
        type table [CompanyId=text, RuleCode=text, RuleName=text, Source=text, Severity=text, Amount=number, Description=text, DetectedOn=datetime]
    ),

    // ------- Combine -------
    Combined = Table.Combine({
        Ex_JE_Weekend, Ex_JE_AfterClose, Ex_JE_Round, Ex_JE_Dup,
        Ex_Bank_Large, Ex_Bank_Unrec,
        Ex_Gst_BooksVs3b, Ex_Gst_ItcVs2b,
        Ex_Payroll_NegNet, Ex_Cash_40A3
    }),

    Exceptions = Table.AddIndexColumn(Combined, "ExceptionIndex", 1, 1, Int64.Type)
in
    Exceptions
