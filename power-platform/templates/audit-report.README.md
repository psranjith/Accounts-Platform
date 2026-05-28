# Audit report template

`audit-report.docx` is consumed by **Flow_GenerateAuditReport** via the
*Populate Word template* connector action.

This folder holds a binary Word file that must be created in Word and uploaded
manually — it cannot live as text in source control. Treat this README as the
spec for the template.

## Required content controls (plain-text controls)

| Tag             | Source field                            |
|-----------------|-----------------------------------------|
| clientName      | adp_auditengagement → adp_companyid     |
| programName     | adp_auditengagement.adp_programname     |
| periodFrom      | adp_auditengagement.adp_periodfrom      |
| periodTo        | adp_auditengagement.adp_periodto        |
| materiality     | adp_auditengagement.adp_materiality     |
| leadPartner     | adp_auditengagement.adp_leadpartner     |
| issueDate       | utcNow('yyyy-MM-dd')                    |

## Required repeating-section controls

| Tag         | Source list                                                  |
|-------------|--------------------------------------------------------------|
| workpapers  | adp_workpaper rows for the engagement (fields: code, name, conclusion) |
| exceptions  | adp_exception rows for the engagement (fields: rulecode, severity, amount, description) |

## Sections

1. **Opinion** — SA-700 wording, references *clientName*, *periodFrom*, *periodTo*.
2. **Basis for Opinion**
3. **Key Audit Matters** — repeating section over `exceptions`.
4. **Responsibilities of Management & Auditor**
5. **Annexure A — Workpaper register** — repeating section over `workpapers`.
6. **Annexure B — Exception register** — repeating section over `exceptions`.

## Build instructions

1. Open Word → New → Blank document.
2. Insert > Quick Parts > Document Property > Plain Text Content Control for each tag.
3. Insert > Quick Parts > Document Property > Repeating Section Content Control for `workpapers` and `exceptions`.
4. Save as `audit-report.docx` in `power-platform/templates/`.
5. Sync to SharePoint at `Smartsoft646 ▸ Audit ▸ audit-report.docx` (the path referenced by the flow).

Until a binary template is added, `Flow_GenerateAuditReport` runs but fails at
the *Populate Word template* step — the engagement stays in **Finalize** until
the docx exists.
