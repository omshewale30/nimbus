// LEGACY all-in-one deployment for Nimbus (still used by CI: deploy-dev.yml).
//
// Subscription-scoped: creates the resource group and all resources within it.
//
// For manual, per-service deployments into an EXISTING resource group, use the
// group-scoped entrypoints in infra/bicep/deploy/ via the scripts in
// infra/scripts/ instead — see docs/runbook.md. Keep this file in sync with
// those entrypoints if you change a module's wiring.
//
// Deploy with:
//   az deployment sub create \
//     --location eastus \
//     --template-file infra/bicep/main.bicep \
//     --parameters infra/bicep/parameters/dev.bicepparam
targetScope = 'subscription'

@description('Prefix for resource names.')
param resourcePrefix string = 'nimbus'

@description('Azure region.')
param location string = 'eastus'

@allowed(['dev', 'prod'])
param environmentName string = 'dev'

@description('Microsoft Entra tenant id.')
param tenantId string = '58b3d54f-16c9-42d3-af08-1fcabd095666'

@description('Backend container image, e.g. myacr.azurecr.io/api:sha.')
param apiImage string

@description('Frontend container image, e.g. myacr.azurecr.io/web:sha.')
param webImage string

@description('PostgreSQL administrator login name.')
param dbAdminLogin string = '${resourcePrefix}admin'

@description('PostgreSQL administrator password. Supply via a pipeline secret, never in source. Keep it URL-safe (alphanumeric): it is interpolated into the SQLAlchemy DATABASE_URL.')
@secure()
param dbAdminPassword string

@description('Entra backend (API) app registration client id.')
param entraBackendClientId string = '9025831a-9aee-4244-89c8-98d0814a5889'

@description('Entra backend app id URI (expected token audience).')
param entraBackendAppIdUri string = 'api://nimbus'

@description('Entra frontend (SPA) app registration client id.')
param entraFrontendClientId string = '9025831a-9aee-4244-89c8-98d0814a5889'

@description('Group object id (or app role) granting admin access.')
param adminGroupId string = ''

@description('AI provider: mock or foundry.')
@allowed(['mock', 'foundry'])
param aiProvider string = 'foundry'

@description('Auth mode: entra or disabled. NEVER use disabled outside local dev.')
@allowed(['entra', 'disabled'])
param authMode string = 'entra'

@description('Azure AI Foundry endpoint (used when aiProvider=foundry).')
param foundryEndpoint string = ''
param foundryDeploymentName string = 'gpt-4o-mini'
param foundryApiVersion string = '2024-08-01-preview'

@description('Embedding deployment name for RAG (must match the foundry deployment).')
param foundryEmbeddingDeploymentName string = 'text-embedding-3-small'

@description('Comma-separated emails allowed to propose/edit content outside git (future use).')
param editorEmails string = ''

@description('Provision Azure AI Search.')
param enableSearch bool = false

var namePrefix = '${resourcePrefix}-${environmentName}'
var tags = {
  application: 'nimbus'
  environment: environmentName
}

resource rg 'Microsoft.Resources/resourceGroups@2023-07-01' = {
  name: 'rg-${namePrefix}'
  location: location
  tags: tags
}

module identity 'modules/identity.bicep' = {
  scope: rg
  name: 'identity'
  params: {
    namePrefix: namePrefix
    location: location
    tags: tags
  }
}

module observability 'modules/observability.bicep' = {
  scope: rg
  name: 'observability'
  params: {
    namePrefix: namePrefix
    location: location
    tags: tags
  }
}

module registry 'modules/registry.bicep' = {
  scope: rg
  name: 'registry'
  params: {
    namePrefix: namePrefix
    location: location
    tags: tags
    appPrincipalId: identity.outputs.principalId
  }
}

module storage 'modules/storage.bicep' = {
  scope: rg
  name: 'storage'
  params: {
    namePrefix: namePrefix
    location: location
    tags: tags
    appPrincipalId: identity.outputs.principalId
  }
}

module db 'modules/postgres.bicep' = {
  scope: rg
  name: 'postgres'
  params: {
    namePrefix: namePrefix
    location: location
    tags: tags
    adminLogin: dbAdminLogin
    adminPassword: dbAdminPassword
  }
}

// Full SQLAlchemy URL, delivered to the API via Key Vault (it embeds the
// admin password, so it must never appear as a plain env var).
var databaseUrl = 'postgresql+psycopg://${dbAdminLogin}:${dbAdminPassword}@${db.outputs.serverFqdn}:5432/${db.outputs.databaseName}?sslmode=require'

module keyVault 'modules/key-vault.bicep' = {
  scope: rg
  name: 'keyVault'
  params: {
    namePrefix: namePrefix
    location: location
    tags: tags
    appPrincipalId: identity.outputs.principalId
    seedSecrets: {
      'appinsights-connection-string': observability.outputs.appInsightsConnectionString
      'database-url': databaseUrl
    }
  }
}

module search 'modules/search.bicep' = if (enableSearch) {
  scope: rg
  name: 'search'
  params: {
    namePrefix: namePrefix
    location: location
    tags: tags
    appPrincipalId: identity.outputs.principalId
  }
}

module env 'modules/container-apps-env.bicep' = {
  scope: rg
  name: 'containerAppsEnv'
  params: {
    namePrefix: namePrefix
    location: location
    tags: tags
    logAnalyticsName: observability.outputs.logAnalyticsName
  }
}

// Precompute FQDNs from the environment default domain to avoid a circular
// dependency between the frontend and backend apps.
var apiAppName = 'ca-${namePrefix}-api'
var webAppName = 'ca-${namePrefix}-web'
var apiFqdn = '${apiAppName}.${env.outputs.defaultDomain}'
var webFqdn = '${webAppName}.${env.outputs.defaultDomain}'
var apiBaseUrl = 'https://${apiFqdn}'
var webOrigin = 'https://${webFqdn}'

var appInsightsSecretUrl = '${keyVault.outputs.keyVaultUri}secrets/appinsights-connection-string'
var databaseUrlSecretUrl = '${keyVault.outputs.keyVaultUri}secrets/database-url'

module apiApp 'modules/container-app.bicep' = {
  scope: rg
  name: 'apiApp'
  params: {
    name: apiAppName
    location: location
    tags: tags
    environmentId: env.outputs.environmentId
    userAssignedIdentityId: identity.outputs.id
    registryServer: registry.outputs.loginServer
    image: apiImage
    targetPort: 8000
    external: true
    envVars: [
      { name: 'ENVIRONMENT', value: environmentName }
      { name: 'AI_PROVIDER', value: aiProvider }
      { name: 'AUTH_MODE', value: authMode }
      { name: 'AZURE_TENANT_ID', value: tenantId }
      { name: 'ENTRA_BACKEND_CLIENT_ID', value: entraBackendClientId }
      { name: 'ENTRA_BACKEND_APP_ID_URI', value: entraBackendAppIdUri }
      { name: 'ADMIN_GROUP_ID', value: adminGroupId }
      { name: 'CORS_ALLOW_ORIGINS', value: webOrigin }
      { name: 'AZURE_STORAGE_ACCOUNT_URL', value: storage.outputs.blobEndpoint }
      { name: 'AZURE_STORAGE_CONTAINER', value: storage.outputs.containerName }
      { name: 'AZURE_AI_FOUNDRY_ENDPOINT', value: foundryEndpoint }
      { name: 'AZURE_AI_FOUNDRY_DEPLOYMENT_NAME', value: foundryDeploymentName }
      { name: 'AZURE_AI_FOUNDRY_API_VERSION', value: foundryApiVersion }
      { name: 'AZURE_AI_FOUNDRY_EMBEDDING_DEPLOYMENT_NAME', value: foundryEmbeddingDeploymentName }
      { name: 'EDITOR_EMAILS', value: editorEmails }
      { name: 'AZURE_SEARCH_ENDPOINT', value: search.?outputs.searchEndpoint ?? '' }
      // Tells DefaultAzureCredential which user-assigned identity to use.
      { name: 'AZURE_CLIENT_ID', value: identity.outputs.clientId }
    ]
    secretRefs: [
      { name: 'appinsights-connection-string', keyVaultUrl: appInsightsSecretUrl }
      { name: 'database-url', keyVaultUrl: databaseUrlSecretUrl }
    ]
    secretEnvVars: [
      { name: 'APPLICATIONINSIGHTS_CONNECTION_STRING', secretRef: 'appinsights-connection-string' }
      { name: 'DATABASE_URL', secretRef: 'database-url' }
    ]
  }
}

module webApp 'modules/container-app.bicep' = {
  scope: rg
  name: 'webApp'
  params: {
    name: webAppName
    location: location
    tags: tags
    environmentId: env.outputs.environmentId
    userAssignedIdentityId: identity.outputs.id
    registryServer: registry.outputs.loginServer
    image: webImage
    targetPort: 3000
    external: true
    envVars: [
      // NOTE: NEXT_PUBLIC_* values are inlined at image BUILD time. Set these as
      // build args in CI; the runtime values below are a convenience/fallback.
      { name: 'NEXT_PUBLIC_API_BASE_URL', value: apiBaseUrl }
      { name: 'NEXT_PUBLIC_AUTH_DISABLED', value: 'false' }
      { name: 'NEXT_PUBLIC_ENTRA_CLIENT_ID', value: entraFrontendClientId }
      { name: 'NEXT_PUBLIC_ENTRA_TENANT_ID', value: tenantId }
      { name: 'NEXT_PUBLIC_ENTRA_REDIRECT_URI', value: webOrigin }
      { name: 'NEXT_PUBLIC_ENTRA_API_SCOPE', value: '${entraBackendAppIdUri}/access_as_user' }
    ]
  }
}

output resourceGroupName string = rg.name
output apiUrl string = apiBaseUrl
output webUrl string = webOrigin
output apiAppName string = apiAppName
output webAppName string = webAppName
output registryLoginServer string = registry.outputs.loginServer
output managedIdentityClientId string = identity.outputs.clientId
output keyVaultName string = keyVault.outputs.keyVaultName
