// Per-service deployment: API (FastAPI) container app.
//
// Group-scoped — deploys into an EXISTING resource group (never creates one).
//   az deployment group create -g rg-nimbus \
//     --template-file infra/bicep/deploy/api-app.bicep \
//     --parameters apiImage=<acr>.azurecr.io/nimbus-api:<tag>
//
// Dependency order: requires `identity`, `observability`, `registry`,
// `storage`, `postgres`, `key-vault`, and `container-apps-env`. All are looked
// up by their deterministic names in this resource group; only the image and
// app config come in as parameters.
targetScope = 'resourceGroup'

@description('Prefix for resource names.')
param resourcePrefix string = 'nimbus'

@allowed(['dev', 'prod'])
param environmentName string = 'dev'

@description('Azure region. Defaults to the resource group location.')
param location string = resourceGroup().location

@description('Backend container image, e.g. myacr.azurecr.io/api:sha.')
param apiImage string

@description('Microsoft Entra tenant id.')
param tenantId string = '58b3d54f-16c9-42d3-af08-1fcabd095666'

@description('Entra backend (API) app registration client id.')
param entraBackendClientId string = '9025831a-9aee-4244-89c8-98d0814a5889'

@description('Entra backend app id URI (expected token audience).')
param entraBackendAppIdUri string = 'api://nimbus'

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

@description('Azure AI Search endpoint (empty if search is not deployed).')
param searchEndpoint string = ''

@description('Blob container name for uploads (must match the storage deployment).')
param storageContainerName string = 'uploads'

@description('Optional explicit ACR name (must match the registry deployment). Empty = acr<prefix><env>.')
param acrName string = ''

var namePrefix = '${resourcePrefix}-${environmentName}'
var tags = {
  application: 'nimbus'
  environment: environmentName
}

// Existing resources, looked up by the same deterministic names the per-service
// deployments (and modules) compute.
resource identity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' existing = {
  name: 'id-${namePrefix}'
}

resource registry 'Microsoft.ContainerRegistry/registries@2023-11-01-preview' existing = {
  name: empty(acrName) ? take('acr${replace(namePrefix, '-', '')}', 50) : acrName
}

resource storage 'Microsoft.Storage/storageAccounts@2023-05-01' existing = {
  name: take('st${replace(namePrefix, '-', '')}', 24)
}

resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' existing = {
  name: take('kv-${replace(namePrefix, '-', '')}', 24)
}

resource env 'Microsoft.App/managedEnvironments@2024-03-01' existing = {
  name: 'cae-${namePrefix}'
}

// Precompute FQDNs from the environment default domain to avoid a circular
// dependency between the frontend and backend apps.
var apiAppName = 'ca-${namePrefix}-api'
var webAppName = 'ca-${namePrefix}-web'
var webOrigin = 'https://${webAppName}.${env.properties.defaultDomain}'
var apiBaseUrl = 'https://${apiAppName}.${env.properties.defaultDomain}'

var appInsightsSecretUrl = '${keyVault.properties.vaultUri}secrets/appinsights-connection-string'
var databaseUrlSecretUrl = '${keyVault.properties.vaultUri}secrets/database-url'

module apiApp '../modules/container-app.bicep' = {
  name: 'apiApp'
  params: {
    name: apiAppName
    location: location
    tags: tags
    environmentId: env.id
    userAssignedIdentityId: identity.id
    registryServer: registry.properties.loginServer
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
      { name: 'AZURE_STORAGE_ACCOUNT_URL', value: storage.properties.primaryEndpoints.blob }
      { name: 'AZURE_STORAGE_CONTAINER', value: storageContainerName }
      { name: 'AZURE_AI_FOUNDRY_ENDPOINT', value: foundryEndpoint }
      { name: 'AZURE_AI_FOUNDRY_DEPLOYMENT_NAME', value: foundryDeploymentName }
      { name: 'AZURE_AI_FOUNDRY_API_VERSION', value: foundryApiVersion }
      { name: 'AZURE_AI_FOUNDRY_EMBEDDING_DEPLOYMENT_NAME', value: foundryEmbeddingDeploymentName }
      { name: 'EDITOR_EMAILS', value: editorEmails }
      { name: 'AZURE_SEARCH_ENDPOINT', value: searchEndpoint }
      // Tells DefaultAzureCredential which user-assigned identity to use.
      { name: 'AZURE_CLIENT_ID', value: identity.properties.clientId }
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

output apiAppName string = apiApp.outputs.name
output apiFqdn string = apiApp.outputs.fqdn
output apiUrl string = apiBaseUrl
