let
    Source = Excel.Workbook(File.Contents(Parameter_BankStatementPath), null, true),
    Transactions = Source{[Item="Transactions", Kind="Sheet"]}[Data],
    Promoted = Table.PromoteHeaders(Transactions, [PromoteAllScalars=true]),
    Typed = Table.TransformColumnTypes(Promoted, {
        {"Date", type date},
        {"Narration", type text},
        {"Debit", type number},
        {"Credit", type number},
        {"Balance", type number}
    }),
    AddedNetAmount = Table.AddColumn(Typed, "NetAmount", each [Credit] - [Debit], type number)
in
    AddedNetAmount
