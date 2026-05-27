# Dataverse Solution Notes

## Solution
- Name: AccountantDeliveryPlatform
- Publisher prefix: adp
- Type: Unmanaged

## Key files
- `src/Other/Solution.xml`: solution metadata and root components
- `src/customizations.xml`: table definitions, columns, relationships, option sets, role markers, field security
- `src/[Content_Types].xml`: package manifest for solution packing

## Pack command
`pac solution pack --folder ./src --zipfile ./AccountantDeliveryPlatform.zip --packagetype Unmanaged`

## Unpack command
`pac solution unpack --zipfile ./AccountantDeliveryPlatform.zip --folder ./src --packagetype Unmanaged --allowDelete yes`

## Data model coverage
Tables included:
- adp_company
- adp_appuser
- adp_entitlement
- adp_tallysession
- adp_dataingestion
- adp_auditlog
- adp_config

Indexes and relationships are declared in customizations metadata to support company-scoped filtering and high-traffic ingestion workloads.
