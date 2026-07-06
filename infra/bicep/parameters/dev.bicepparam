using '../main.bicep'

// Non-secret values are safe to keep here. Secrets and image tags are read from
// environment variables (set by the CI pipeline), never committed.

param environmentName = 'dev'
param resourcePrefix = 'nimbus'
param location = 'eastus'
param tenantId = '58b3d54f-16c9-42d3-af08-1fcabd095666'

param apiImage = readEnvironmentVariable('API_IMAGE', 'REPLACE_ME.azurecr.io/nimbus-api:latest')
param webImage = readEnvironmentVariable('WEB_IMAGE', 'REPLACE_ME.azurecr.io/nimbus-web:latest')

param sqlAdminLogin = 'nimbusadmin'
param sqlAdminPassword = readEnvironmentVariable('SQL_ADMIN_PASSWORD')

param entraBackendClientId = '9025831a-9aee-4244-89c8-98d0814a5889'
param entraBackendAppIdUri = 'api://nimbus'
param entraFrontendClientId = '9025831a-9aee-4244-89c8-98d0814a5889'
param adminGroupId = readEnvironmentVariable('ADMIN_GROUP_ID', '')

param aiProvider = 'foundry'
param authMode = 'entra'
param foundryEndpoint = readEnvironmentVariable('AZURE_AI_FOUNDRY_ENDPOINT', '')
param enableSearch = false
