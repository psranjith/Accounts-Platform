# Flow Setup Notes

This folder contains source-controlled flow definitions exported as JSON templates.

## Flows
- Flow_OnboardCompany
- Flow_InviteUser
- Flow_LaunchTally
- Flow_IngestEmail
- Flow_IngestWhatsApp
- Flow_IngestTelegram

## Required connection references
- shared_commondataserviceforapps
- shared_msgraph
- shared_sharepointonline
- shared_powerbi
- shared_office365
- shared_aibuilder

## Environment variables
- adp_AzureStorageApiBase
- adp_AzureStorageApiKey (secure)
- adp_AzureStorageContainerBase
- adp_PortalUrl
- adp_RdpFunctionBaseUrl
- adp_RdpFunctionKey (secure)
- adp_IngestionMailbox
- adp_UseAIBuilder
- adp_AIBuilderModelId
- adp_DocIntelEndpoint
- adp_DocIntelKey (secure)
- adp_SharePointSiteUrl
- adp_WhatsAppAccessToken (secure)
- adp_TelegramBotToken (secure)

## Secret storage options
1. Dataverse table adp_config
   - Use key/value rows per environment scope.
   - Protect adp_value with column security.
2. Azure Key Vault connector
   - Store all API keys and tokens in Key Vault.
   - Reference secrets in flow actions at runtime.

## Import/export guidance
- Keep each flow in its own solution-aware cloud flow.
- Use pac solution add-reference for flows if represented as separate source folders.
- After updates in maker portal, run scripts/pull.ps1 to refresh JSON snapshots.
