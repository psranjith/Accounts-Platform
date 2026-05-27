let
    Sales = Excel.Workbook(File.Contents(Parameter_GSTSalesPath), null, true){[Item="Sales", Kind="Sheet"]}[Data],
    Purchases = Excel.Workbook(File.Contents(Parameter_GSTPurchasePath), null, true){[Item="Purchases", Kind="Sheet"]}[Data],
    SalesPromoted = Table.PromoteHeaders(Sales, [PromoteAllScalars=true]),
    PurchasesPromoted = Table.PromoteHeaders(Purchases, [PromoteAllScalars=true]),
    SalesTyped = Table.TransformColumnTypes(SalesPromoted, {{"GSTIN", type text}, {"InvoiceNo", type text}, {"GSTAmount", type number}}),
    PurchasesTyped = Table.TransformColumnTypes(PurchasesPromoted, {{"GSTIN", type text}, {"InvoiceNo", type text}, {"GSTAmount", type number}}),
    Merged = Table.NestedJoin(SalesTyped, {"InvoiceNo"}, PurchasesTyped, {"InvoiceNo"}, "PurchaseMatch", JoinKind.LeftOuter),
    Expanded = Table.ExpandTableColumn(Merged, "PurchaseMatch", {"GSTAmount"}, {"PurchaseGSTAmount"}),
    AddedVariance = Table.AddColumn(Expanded, "GSTVariance", each [GSTAmount] - (if [PurchaseGSTAmount] = null then 0 else [PurchaseGSTAmount]), type number)
in
    AddedVariance
