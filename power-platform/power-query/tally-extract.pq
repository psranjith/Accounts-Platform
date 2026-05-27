let
    Source = Csv.Document(File.Contents(Parameter_TallyExportPath), [Delimiter=",", Columns=20, Encoding=65001, QuoteStyle=QuoteStyle.Csv]),
    Promoted = Table.PromoteHeaders(Source, [PromoteAllScalars=true]),
    Typed = Table.TransformColumnTypes(Promoted, {
        {"VoucherDate", type date},
        {"VoucherNumber", type text},
        {"LedgerName", type text},
        {"Amount", type number},
        {"GSTType", type text},
        {"CompanyCode", type text}
    })
in
    Typed
